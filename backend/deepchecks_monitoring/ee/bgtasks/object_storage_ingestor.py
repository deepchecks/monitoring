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
from urllib.parse import urlparse

import boto3
import pandas as pd
import pendulum as pdl
from pandas.core.dtypes.common import is_integer_dtype
from redis.asyncio.lock import Lock
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend
from deepchecks_monitoring.monitoring_utils import configure_logger
from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.public_models.task import BackgroundWorker, Task
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Model, ModelVersion
from deepchecks_monitoring.schema_models.column_type import SAMPLE_TS_COL
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

        organization_id = task.params['organization_id']
        model_id = task.params['model_id']

        organization_schema = (await session.scalar(
            select(Organization.schema_name)
            .where(Organization.id == organization_id)
        ))

        if organization_schema is None:
            await session.commit()
            return

        await database.attach_schema_switcher_listener(
            session=session,
            schema_search_path=[organization_schema, 'public']
        )

        model: Model = (await session.scalar(select(Model).options(selectinload(Model.versions))
                                             .where(Model.id == model_id)))
        if model is None:
            await session.commit()
            return

        # Get s3 authentication info
        s3_data_source = (await session.scalar(select(DataSource).where(DataSource.type == 's3')))
        if s3_data_source is None:
            self.logger.warning({'message': 'No data source of type s3 found'})
            await session.commit()
            return

        access_key = s3_data_source.parameters['aws_access_key_id']
        secret_key = s3_data_source.parameters['aws_secret_access_key']
        s3 = boto3.client(
            's3',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key
        )

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
            # If first scan of specific version - scan all files under version, else scan only new files by date
            version_prefixes = model_prefixes if version.latest_file_time is not None else ['']
            for prefix in version_prefixes:
                for df, time in self.ingest_prefix(s3, bucket, f'{version_path}/{prefix}', version.latest_file_time):
                    await self.ingestion_backend.log_samples(version, df, session, organization_id, new_scan_time)
                    version.latest_file_time = max(version.latest_file_time, time)
                    # For each file, set lock expiry to 120 seconds from now
                    await lock.extend(120, replace_ttl=True)

        # Ingest labels
        for prefix in model_prefixes:
            labels_path = f'{model_path}/labels/{prefix}'
            for df, time in self.ingest_prefix(s3, bucket, labels_path, model.latest_labels_file_time):
                await self.ingestion_backend.log_labels(model, df, session, organization_id)
                model.latest_labels_file_time = max(model.latest_labels_file_time, time)
                # For each file, set lock expiry to 120 seconds from now
                await lock.extend(120, replace_ttl=True)

        model.obj_store_last_scan_time = new_scan_time
        await session.commit()
        s3.close()

    def ingest_prefix(self, s3, bucket, prefix, last_file_time=None):
        """Ingest all files in prefix, return df and file time"""
        last_file_time = last_file_time or pdl.datetime(year=1970, month=1, day=1)
        # First read all file names, then retrieve them sorted by date
        resp = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
        files = []
        if 'Contents' not in resp:
            self.logger.error({'message': f'No files found for bucket {bucket} and prefix {prefix}'})
            return

        # Iterate over files in prefix
        for obj in resp['Contents']:
            key = obj['Key']
            file_with_extension = key.rsplit('/', maxsplit=1)[-1]
            if file_with_extension.count('.') != 1:
                self.logger.error({'message': f'Expected single dot in file name: {file_with_extension}'})
                continue
            file_name, extension = file_with_extension.split('.')
            if extension not in ['csv', 'parquet']:
                self.logger.error({'message': f'Invalid file extension: {extension}'})
                continue
            try:
                file_time = pdl.parse(file_name)
            except pdl.parsing.exceptions.ParserError:
                self.logger.error({'message': f'Invalid date format in file name: {file_name}'})
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
            elif file['extension'] == 'parquet':
                df = pd.read_parquet(value)
            else:
                self.logger.error({'message': f'Invalid file extension: {file["extension"]}'})
                continue

            if SAMPLE_TS_COL not in df or not is_integer_dtype(df[SAMPLE_TS_COL]):
                self.logger.error({'message': f'Invalid timestamp column: {SAMPLE_TS_COL}'})
                continue
            # The user facing API requires unix timestamps, but for the ingestion we convert it to ISO format
            df[SAMPLE_TS_COL] = df[SAMPLE_TS_COL].apply(lambda x: pdl.from_timestamp(x).isoformat())
            # Sort by timestamp
            df = df.sort_values(by=[SAMPLE_TS_COL])
            yield df, file['time']
