# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#
import io
import typing as t
from urllib.parse import urlparse

import boto3
import fastjsonschema
import pandas as pd
import pendulum as pdl
from botocore.config import Config
from botocore.exceptions import ClientError, EndpointConnectionError
from deepchecks_client.core.utils import TaskType
from deepchecks_client.tabular.client import process_batch
from pandas.core.dtypes.common import is_integer_dtype
from redis.asyncio.lock import Lock
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend, save_failures
from deepchecks_monitoring.monitoring_utils import configure_logger
from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.public_models.task import BackgroundWorker, Task
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Model, ModelVersion
from deepchecks_monitoring.schema_models.column_type import (SAMPLE_ID_COL, SAMPLE_PRED_COL, SAMPLE_PRED_PROBA_COL,
                                                             SAMPLE_TS_COL)
from deepchecks_monitoring.schema_models.data_sources import DataSource
from deepchecks_monitoring.utils import database

__all__ = ['ObjectStorageIngestor']


class ObjectStorageIngestor(BackgroundWorker):
    """Worker to ingest files from s3"""

    def __init__(self, resources_provider: ResourcesProvider):
        super().__init__()
        self.ingestion_backend = DataIngestionBackend(resources_provider)
        self.logger = configure_logger(self.__class__.__name__)

    @classmethod
    def queue_name(cls) -> str:
        return 'object_storage_ingestion'

    @classmethod
    def delay_seconds(cls) -> int:
        return 0

    async def run(self, task: 'Task', session: AsyncSession, resources_provider: ResourcesProvider, lock: Lock):
        await session.execute(delete(Task).where(Task.id == task.id))
        task_id = task.id
        organization_id = task.params['organization_id']
        model_id = task.params['model_id']

        self.logger.info({'message': 'starting job', 'worker name': str(type(self)),
                          'task': task_id, 'model_id': model_id, 'org_id': organization_id})

        organization_schema = (await session.scalar(
            select(Organization.schema_name)
            .where(Organization.id == organization_id)
        ))

        errors = []

        if organization_schema is None:
            self._handle_error(errors, f'Could not locate organization with id {organization_id}')
            await self._finalize_before_exit(session, errors)
            return

        await database.attach_schema_switcher_listener(
            session=session,
            schema_search_path=[organization_schema, 'public']
        )

        model: Model = (await session.scalar(select(Model).options(selectinload(Model.versions))
                                             .where(Model.id == model_id)))
        if model is None:
            self._handle_error(errors, f'Could not locate model with id {model_id}')
            await self._finalize_before_exit(session, errors)
            return

        # Get s3 authentication info
        s3_data_source = (await session.scalar(select(DataSource).where(DataSource.type == 's3')))
        if s3_data_source is None:
            self._handle_error(errors, 'No data source of type s3 found', model_id)
            await self._finalize_before_exit(session, errors)
            return

        access_key = s3_data_source.parameters['aws_access_key_id']
        secret_key = s3_data_source.parameters['aws_secret_access_key']
        region = s3_data_source.parameters['region']

        # first - test connectivity to AWS
        try:
            sts = boto3.client(
                'sts',
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=Config(region_name=region)
            )
            sts.get_caller_identity()
        except (ClientError, EndpointConnectionError):
            self.logger.exception({'message': 'Invalid credentials to AWS'})
            self._handle_error(errors, 'Invalid credentials to AWS', model_id)
            await self._finalize_before_exit(session, errors)
            return

        s3 = boto3.client(
            's3',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key
        )

        if not model.obj_store_path:
            self._handle_error(errors, 'Model is missing object store path configuration', model_id)
            await self._finalize_before_exit(session, errors)
            return

        try:
            s3_url = urlparse(model.obj_store_path)
            model_path = s3_url.path[1:]
            if model_path[-1] == '/':
                model_path = model_path[:-1]
            bucket = s3_url.netloc
            new_scan_time = pdl.now()
            # First ever scan of model - will scan all files
            if model.obj_store_last_scan_time is None:
                model_prefixes = ['']
            # Else scan only new files since last scan (by date)
            else:
                model_prefixes = []
                date = pdl.instance(model.obj_store_last_scan_time).date()
                while date <= new_scan_time.date():
                    date = date.add(days=1)
                    model_prefixes.append(date.isoformat())

            version: ModelVersion
            for version in model.versions:
                version_path = f'{model_path}/{version.name}'
                version_id = version.id
                # If first scan of specific version - scan all files under version, else scan only new files by date
                version_prefixes = model_prefixes if version.latest_file_time is not None else ['']
                for prefix in version_prefixes:
                    for df, time, file_name in self.ingest_prefix(s3, bucket, f'{version_path}/{prefix}',
                                                                  version.latest_file_time,
                                                                  errors, model_id, version_id, need_ts=True):
                        try:
                            all_columns = {
                                **version.features_columns,
                                **version.additional_data_columns
                            }
                            sample_ids = df[SAMPLE_ID_COL]
                            df.drop(SAMPLE_ID_COL, axis=1, inplace=True)
                            timestamps = df[SAMPLE_TS_COL]
                            df.drop(SAMPLE_TS_COL, axis=1, inplace=True)

                            if SAMPLE_PRED_COL in df.columns:
                                predictions = df[SAMPLE_PRED_COL]
                                df.drop(SAMPLE_PRED_COL, axis=1, inplace=True)
                            else:
                                predictions = None
                            if SAMPLE_PRED_PROBA_COL in df.columns:
                                prediction_probas = df[SAMPLE_PRED_PROBA_COL]
                                df.drop(SAMPLE_PRED_PROBA_COL, axis=1, inplace=True)
                            else:
                                prediction_probas = None

                            data_batch = process_batch(
                                schema_validator=t.cast(t.Callable[..., t.Any],
                                                        fastjsonschema.compile(version.monitor_json_schema)),
                                data_columns=all_columns,
                                task_type=TaskType(model.task_type.value),
                                sample_ids=sample_ids,
                                data=df,
                                timestamps=timestamps,
                                predictions=predictions,
                                prediction_probas=prediction_probas,
                                model_classes=version.classes,
                            )

                            # For each file, set lock expiry to 360 seconds from now
                            await lock.extend(360, replace_ttl=True)
                            model_version: ModelVersion = (
                                await session.scalar(select(ModelVersion).options(selectinload(ModelVersion.model))
                                                     .where(ModelVersion.id == version_id))
                            )
                            await self.ingestion_backend.log_samples(model_version, pd.DataFrame(data_batch),
                                                                     session, organization_id, new_scan_time)
                            model_version.latest_file_time = max(model_version.latest_file_time or
                                                                 pdl.datetime(year=1970, month=1, day=1), time)
                        except ValueError as e:
                            self._handle_error(
                                errors,
                                f'Validation Error while processing file {file_name}: {str(e)}',
                                model_id=model_id,
                                model_version_id=version_id
                            )
                        except Exception:  # pylint: disable=broad-except
                            self._handle_error(
                                errors,
                                f'Error while processing file {file_name}',
                                model_id=model_id,
                                model_version_id=version_id
                            )
                            self.logger.exception({'message': f'Error while processing file {file_name}',
                                                   'task': task_id, 'model_id': model_id, 'org_id': organization_id})

            # Ingest labels
            for prefix in model_prefixes:
                labels_path = f'{model_path}/labels/{prefix}'
                for df, time, file_name in self.ingest_prefix(s3, bucket, labels_path, model.latest_labels_file_time,
                                                              errors, model_id):
                    try:
                        # For each file, set lock expiry to 360 seconds from now
                        await lock.extend(360, replace_ttl=True)
                        await self.ingestion_backend.log_labels(model, df, session, organization_id)
                        model.latest_labels_file_time = max(model.latest_labels_file_time
                                                            or pdl.datetime(year=1970, month=1, day=1), time)
                    except Exception:  # pylint: disable=broad-except
                        self._handle_error(
                            errors,
                            f'Error while processing file {file_name}',
                            model_id=model_id,
                            model_version_id=version_id
                        )
                        self.logger.exception({'message': f'Error while labels processing file {file_name}',
                                               'task': task_id, 'model_id': model_id, 'org_id': organization_id})

            model.obj_store_last_scan_time = new_scan_time
        except Exception:  # pylint: disable=broad-except
            self.logger.exception({'message': 'General Error when ingesting data',
                                   'task': task_id, 'model_id': model_id, 'org_id': organization_id})
            self._handle_error(errors, 'General Error when ingesting data', model_id)
        finally:
            await self._finalize_before_exit(session, errors)
            s3.close()

        self.logger.info({'message': 'finished job', 'worker name': str(type(self)),
                          'task': task_id, 'model_id': model_id, 'org_id': organization_id})

    def ingest_prefix(self, s3, bucket, prefix, last_file_time, errors,
                      model_id, version_id=None, need_ts: bool = False):
        """Ingest all files in prefix, return df and file time"""
        last_file_time = last_file_time or pdl.datetime(year=1970, month=1, day=1)
        # First read all file names, then retrieve them sorted by date
        resp = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
        files = []
        if 'Contents' not in resp:
            self._handle_error(errors, f'No files found for bucket {bucket} and prefix {prefix}', model_id, version_id)
            return

        # Iterate over files in prefix
        for obj in resp['Contents']:
            key = obj['Key']
            file_with_extension = key.rsplit('/', maxsplit=1)[-1]
            if len(file_with_extension) == 0:  # ingesting the folder
                if obj['Size'] != 0:  # not a folder then
                    self._handle_error(errors,
                                       f'File without extention {key} found for bucket {bucket} and prefix {prefix}',
                                       model_id, version_id)
                continue
            if file_with_extension.count('.') != 1:
                self._handle_error(errors, f'Expected single dot in file name: {key}', model_id,
                                   version_id)
                continue
            file_name, extension = file_with_extension.split('.')
            if extension not in ['csv', 'parquet']:
                self._handle_error(errors, f'Invalid file extension: {extension}, for file {key}',
                                   model_id, version_id)
                continue
            try:
                file_time = pdl.parse(file_name)
            except pdl.parsing.exceptions.ParserError:
                self._handle_error(errors, f'Invalid date format in file name: {key}', model_id,
                                   version_id)
                continue
            # If file is before the last file ingested - skip
            if file_time > last_file_time:
                files.append({'key': key, 'time': file_time, 'extension': extension})
            else:
                self.logger.info({'message': f'file {key} is before latest file time {last_file_time} - skipping'})

        files = sorted(files, key=lambda x: x['time'])
        for file in files:
            self.logger.info({'message': f'Ingesting file {file["key"]}'})
            file_response = s3.get_object(Bucket=bucket, Key=file['key'])
            value = io.BytesIO(file_response.get('Body').read())
            if file['extension'] == 'csv':
                df = pd.read_csv(value)
                df[SAMPLE_ID_COL] = df[SAMPLE_ID_COL].astype(str)
            elif file['extension'] == 'parquet':
                df = pd.read_parquet(value)
            else:
                self._handle_error(errors, f'Invalid file extension: {file["extension"]}, for file: {file["key"]}',
                                   model_id, version_id)
                continue
            if need_ts:
                if SAMPLE_TS_COL not in df or not is_integer_dtype(df[SAMPLE_TS_COL]):
                    self._handle_error(errors, f'Invalid timestamp column: {SAMPLE_TS_COL}, in file: {file["key"]}',
                                       model_id, version_id)
                    continue
                # Sort by timestamp
                df = df.sort_values(by=[SAMPLE_TS_COL])
            yield df, file['time'], file_with_extension

    def _handle_error(self, errors, error_message, model_id=None, model_version_id=None, set_warning_in_logs=True):

        error_message = f'S3 integration - {error_message}'

        log_message = {'message': f'{error_message}, model_id: {model_id}, version_id: {model_version_id}'}
        if set_warning_in_logs:
            self.logger.warning(log_message)
        else:
            self.logger.error(log_message)

        errors.append(dict(sample=None,
                           sample_id=None,
                           error=error_message,
                           model_id=model_id,
                           model_version_id=model_version_id))

    async def _finalize_before_exit(self, session, errors):
        await save_failures(session, errors, self.logger)
