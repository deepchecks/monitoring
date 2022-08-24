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
import copy
import typing as t
from io import StringIO

import numpy as np
import pandas as pd
import pendulum as pdl
from fastapi import Body, Depends, Response, UploadFile, status
from jsonschema.validators import validate
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.functions import count

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, limit_request_size
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.logic.data_tables import SAMPLE_ID_COL, SAMPLE_TS_COL
from deepchecks_monitoring.models import ModelVersion
from deepchecks_monitoring.models.model_version import update_statistics_from_sample
from deepchecks_monitoring.utils import fetch_or_404

from .router import router


@router.post("/model-versions/{model_version_id}/data", tags=[Tags.DATA],
             summary="Log inference data per model version.",
             description="This API logs asynchronously a batch of new samples of the inference data of an existing "
                         "model version, it requires the actual data and validates it matches the version schema.",)
async def log_data_batch(
    model_version_id: int,
    data: t.List[t.Dict[t.Any, t.Any]] = Body(...),
    session: AsyncSession = AsyncSessionDep
) -> Response:
    """Insert batch data samples.

    Parameters
    ----------
    model_version_id
    data
    session
    """
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id)
    if len(data) == 0:
        return Response(status_code=status.HTTP_400_BAD_REQUEST, content="Got empty list")

    max_timestamp = None
    min_timestamp = None
    updated_statistics = copy.deepcopy(model_version.statistics)
    for sample in data:
        validate(schema=model_version.monitor_json_schema, instance=sample)
        # Timestamp is passed as string, convert it to datetime
        sample[SAMPLE_TS_COL] = pdl.parse(sample[SAMPLE_TS_COL])
        max_timestamp = sample[SAMPLE_TS_COL] if max_timestamp is None else max(max_timestamp, sample[SAMPLE_TS_COL])
        min_timestamp = sample[SAMPLE_TS_COL] if min_timestamp is None else min(min_timestamp, sample[SAMPLE_TS_COL])
        update_statistics_from_sample(updated_statistics, sample)

    monitor_table = model_version.get_monitor_table(session)
    await session.execute(monitor_table.insert(), data)
    await model_version.update_timestamps(min_timestamp, max_timestamp, session)
    if model_version.statistics != updated_statistics:
        await model_version.update_statistics(updated_statistics, session)
    return Response(status_code=status.HTTP_201_CREATED)


@router.put("/model-versions/{model_version_id}/data", tags=[Tags.DATA])
async def update_data_batch(
    model_version_id: int,
    data: t.List[t.Dict[t.Any, t.Any]] = Body(...),
    session: AsyncSession = AsyncSessionDep
):
    """Update data samples.

    Parameters
    ----------
    model_version_id
    data
    session
    """
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id)
    if len(data) == 0:
        return Response(status_code=status.HTTP_400_BAD_REQUEST, content="Got empty list")

    json_schema = model_version.monitor_json_schema
    required_columns = set(json_schema["required"])
    # Create update schema, which contains only non-required columns and sample id
    optional_columns_schema = {
        "type": "object",
        "properties": {k: v for k, v in json_schema["properties"].items()
                       if k not in required_columns or k == SAMPLE_ID_COL},
        "required": [SAMPLE_ID_COL]
    }

    table = model_version.get_monitor_table(session)
    updated_statistics = copy.deepcopy(model_version.statistics)

    for sample in data:
        validate(schema=optional_columns_schema, instance=sample)
        sample_id = sample.pop(SAMPLE_ID_COL)
        update_statistics_from_sample(updated_statistics, sample)
        await session.execute(
            update(table).where(table.c[SAMPLE_ID_COL] == sample_id).values(sample)
        )

    if model_version.statistics != updated_statistics:
        await model_version.update_statistics(updated_statistics, session)

    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/model-versions/{model_version_id}/reference",
    dependencies=[Depends(limit_request_size(500_000_000))],
    tags=[Tags.DATA],
    summary="Upload reference data for a given model version.",
    description="This API uploads asynchronously a reference data file for a given model version,"
                "it requires the actual data and validates it matches the version schema.",
)
async def save_reference(
    model_version_id: int,
    file: UploadFile,
    session: AsyncSession = AsyncSessionDep
):
    """Upload reference data for a given model version.

    Parameters
    ----------
    model_version_id
    file
    session
    """
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id)
    ref_table = model_version.get_reference_table(session)
    count_result = await session.execute(select(count()).select_from(ref_table))
    if count_result.scalar() > 0:
        raise BadRequest("Already have reference data")

    contents = await file.read()
    data = pd.read_json(StringIO(contents.decode()), orient="table")
    data = data.replace(np.NaN, pd.NA).where(data.notnull(), None)
    if len(data) > 100_000:
        raise BadRequest(f"Maximum number of samples allowed for reference is 100,000 but got: {len(data)}")

    items = []
    for (_, row) in data.iterrows():
        item = row.to_dict()
        try:
            validate(schema=model_version.reference_json_schema, instance=item)
        except Exception as e:
            raise BadRequest(f"Invalid reference data: {e}") from e
        items.append(item)

    await session.execute(ref_table.insert(), items)
    return Response(status_code=status.HTTP_200_OK)
