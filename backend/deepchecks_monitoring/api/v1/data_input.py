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

import fastjsonschema
import numpy as np
import pandas as pd
import pendulum as pdl
from fastapi import Body, Depends, Response, UploadFile, status
from fastapi.responses import ORJSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.sql.functions import count

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import (AsyncSessionDep, DataIngestionDep, ResourcesProviderDep,
                                                limit_request_size)
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend
from deepchecks_monitoring.monitoring_utils import fetch_or_404
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.schema_models import ModelVersion
from deepchecks_monitoring.utils.auth import CurrentActiveUser
from deepchecks_monitoring.utils.other import datetime_sample_formatter

from .router import router


async def _log_or_update(model_version_id, data, session, data_ingest, user, resources_provider, action):
    if len(data) == 0:
        return ORJSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": "Got empty list"})
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id,
                                                     options=joinedload(ModelVersion.model))
    time = pdl.now()
    minute_rate = resources_provider.launchdarkly_variation("rows-per-minute", user, default=100_000)
    # Atomically getting the count and increasing in order to avoid race conditions
    curr_count = resources_provider.cache_functions.get_and_incr_user_rate_count(user, time, len(data))
    remains = minute_rate - curr_count
    # Remains can be negative because we don't check the limit before incrementing
    if remains <= 0:
        content = {"detail": f"Rate limit exceeded, you can send {minute_rate} rows per minute",
                   "num_saved": 0}
        return ORJSONResponse(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, content=content)
    await data_ingest.log_or_update(model_version, data[:remains], session, user, action, time)
    if remains < len(data):
        content = {"detail": f"Rate limit exceeded, you can send {minute_rate} rows per minute. "
                             f"{remains} first rows were received",
                   "num_saved": remains}
        return ORJSONResponse(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, content=content)

    return Response(status_code=status.HTTP_200_OK)


@router.post("/model-versions/{model_version_id}/data", tags=[Tags.DATA],
             summary="Log inference data per model version.",
             description="This API logs asynchronously a batch of new samples of the inference data of an existing "
                         "model version, it requires the actual data and validates it matches the version schema.",)
async def log_data_batch(
    model_version_id: int,
    data: t.List[t.Dict[str, t.Any]] = Body(...),
    session: AsyncSession = AsyncSessionDep,
    data_ingest: DataIngestionBackend = DataIngestionDep,
    user: User = Depends(CurrentActiveUser()),
    resources_provider=ResourcesProviderDep
):
    """Insert batch data samples."""
    return await _log_or_update(model_version_id, data, session, data_ingest, user, resources_provider, "log")


@router.put("/model-versions/{model_version_id}/data", tags=[Tags.DATA])
async def update_data_batch(
    model_version_id: int,
    data: t.List[t.Dict[t.Any, t.Any]] = Body(...),
    session: AsyncSession = AsyncSessionDep,
    data_ingest: DataIngestionBackend = DataIngestionDep,
    user: User = Depends(CurrentActiveUser()),
    resources_provider=ResourcesProviderDep
):
    """Update data samples."""
    return await _log_or_update(model_version_id, data, session, data_ingest, user, resources_provider, "update")


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

    reference_batch = t.cast(pd.DataFrame, pd.read_json(
        StringIO(content.decode()),
        orient="split",
        convert_axes=False,
        dtype=False,
        convert_dates=False
    ))

    reference_batch = reference_batch.replace(np.NaN, pd.NA).where(reference_batch.notnull(), None)
    items = []

    validator = t.cast(t.Callable[..., t.Any], fastjsonschema.compile(model_version.reference_json_schema))

    for _, row in reference_batch.iterrows():
        item = row.to_dict()
        try:
            validator(item)
        except fastjsonschema.JsonSchemaValueException as e:
            raise BadRequest(f"Invalid reference data: {e}") from e
        else:
            # TODO:
            # 'asyncpg' driver requires values for date columns to be passed as a datetime|date instances
            # this fact is a limitation for us, date parsing takes a lot of time and we actually doing
            # it twice here, first time it is done by the 'fastjsonschema' and second time by us with help of
            # the 'datetime_sample_formatter' function.
            datetime_sample_formatter(item, model_version)
            items.append(item)

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
