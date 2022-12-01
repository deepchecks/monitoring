# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""V1 API of the data input."""
import typing as t
from io import StringIO

import boto3
import numpy as np
import pandas as pd
from fastapi import Body, Depends, Response, UploadFile, status
from jsonschema import FormatChecker
from jsonschema.exceptions import ValidationError
from jsonschema.validators import validator_for
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.functions import count

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, DataIngestionDep, S3BucketDep, limit_request_size
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend
from deepchecks_monitoring.logic.s3_image_utils import base64_image_data_to_s3
from deepchecks_monitoring.monitoring_utils import fetch_or_404
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.schema_models import ModelVersion
from deepchecks_monitoring.schema_models.column_type import SAMPLE_S3_IMAGE_COL
from deepchecks_monitoring.utils.auth import CurrentActiveUser

from .router import router


@router.post("/model-versions/{model_version_id}/data", tags=[Tags.DATA],
             summary="Log inference data per model version.",
             description="This API logs asynchronously a batch of new samples of the inference data of an existing "
                         "model version, it requires the actual data and validates it matches the version schema.",)
async def log_data_batch(
    model_version_id: int,
    data: t.List[t.Dict[str, t.Any]] = Body(...),
    session: AsyncSession = AsyncSessionDep,
    data_ingest: DataIngestionBackend = DataIngestionDep,
    user: User = Depends(CurrentActiveUser())
) -> Response:
    """Insert batch data samples.

    Parameters
    ----------
    model_version_id
    data
    session
    data_ingest
    user
    """
    if len(data) == 0:
        return Response(status_code=status.HTTP_400_BAD_REQUEST, content="Got empty list")
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id)
    await data_ingest.log(model_version, data, session, user)
    return Response(status_code=status.HTTP_200_OK)


@router.put("/model-versions/{model_version_id}/data", tags=[Tags.DATA])
async def update_data_batch(
    model_version_id: int,
    data: t.List[t.Dict[t.Any, t.Any]] = Body(...),
    session: AsyncSession = AsyncSessionDep,
    data_ingest: DataIngestionBackend = DataIngestionDep,
    user: User = Depends(CurrentActiveUser())
):
    """Update data samples.

    Parameters
    ----------
    request
    model_version_id
    data
    session
    data_ingest
    user
    """
    if len(data) == 0:
        return Response(status_code=status.HTTP_400_BAD_REQUEST, content="Got empty list")
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id)
    await data_ingest.update(model_version, data, session, user)
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/model-versions/{model_version_id}/reference",
    dependencies=[Depends(limit_request_size(20_000_000))],
    tags=[Tags.DATA],
    summary="Upload reference data for a given model version.",
    description="This API uploads asynchronously a reference data file for a given model version,"
                "it requires the actual data and validates it matches the version schema.",
)
async def save_reference(
    model_version_id: int,
    batch: UploadFile,
    session: AsyncSession = AsyncSessionDep,
    s3_bucket: str = S3BucketDep,
    user: User = Depends(CurrentActiveUser()),
):
    """Upload reference data for a given model version.

    Parameters
    ----------
    model_version_id:
        model version primary key
    batch:
        batch of reference samples
    session:
        database session instance
    s3_bucket
    user
    """
    max_samples = 100_000
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id)
    ref_table = model_version.get_reference_table(session)
    n_of_samples_query = select(count()).select_from(ref_table)
    current_samples = await session.scalar(n_of_samples_query)
    limit_exceeded_message = "Maximum allowed number of reference data samples is already uploaded"

    # check available reference samples number to prevent
    # unneeded work (data read and data validation)
    if current_samples >= max_samples:
        raise BadRequest(limit_exceeded_message)

    content = await batch.read()
    reference_batch: pd.DataFrame = pd.read_json(StringIO(content.decode()), orient="table")
    reference_batch = reference_batch.replace(np.NaN, pd.NA).where(reference_batch.notnull(), None)

    if SAMPLE_S3_IMAGE_COL in reference_batch.columns:
        if s3_bucket:
            s3_client = boto3.client("s3")
            base64_images_col = reference_batch[SAMPLE_S3_IMAGE_COL]
            uri_images = []
            for i, base64_image in enumerate(base64_images_col):
                uri_images.append(base64_image_data_to_s3(base64_image, str(i + current_samples),
                                                          model_version, user.organization_id, s3_bucket, s3_client))
            reference_batch[SAMPLE_S3_IMAGE_COL] = pd.Series(uri_images)
        else:
            reference_batch[SAMPLE_S3_IMAGE_COL] = None

    items = []

    validator_class = validator_for(model_version.reference_json_schema)
    val_instance = validator_class(model_version.reference_json_schema, format_checker=FormatChecker())
    for _, row in reference_batch.iterrows():
        item = row.to_dict()
        try:
            val_instance.validate(item)
            items.append(item)
        except ValidationError as e:
            raise BadRequest(f"Invalid reference data: {e}") from e

    # lock will be released automatically at transaction commit/rollback
    await session.execute(select(func.pg_advisory_xact_lock(model_version_id)))

    # check available reference samples number after a lock acquire
    # to ensure the limit of 100_000 records
    n_of_samples = await session.scalar(n_of_samples_query)
    if n_of_samples > max_samples:
        raise BadRequest(limit_exceeded_message)

    # trim received data to ensure the limit of 100_000 records
    if (len(items) + n_of_samples) > max_samples:
        items = items[:max_samples - n_of_samples]

    await session.execute(ref_table.insert(), items)
    return Response(status_code=status.HTTP_200_OK)
