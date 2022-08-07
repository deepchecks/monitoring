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

import pandas as pd
import pendulum as pdl
from fastapi import Body, Depends, Response, UploadFile, status
from jsonschema import validate
from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.functions import count

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, limit_request_size
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.logic.data_tables import SAMPLE_ID_COL, SAMPLE_TS_COL
from deepchecks_monitoring.models import ModelVersion
from deepchecks_monitoring.utils import fetch_or_404

from .router import router


@router.post("/model-versions/{model_version_id}/data", tags=[Tags.DATA],
             summary="Log inference data per model version.",
             description="This API logs asynchronously a new sample of the inference data of an existing model version,"
                         "it requires the actual data and validates it matches the version schema.",)
async def log_data(
    model_version_id: int,
    data: t.Dict[t.Any, t.Any] = Body(...),
    session: AsyncSession = AsyncSessionDep
) -> Response:
    """Insert single data sample.

    Parameters
    ----------
    model_version_id
    data
    session
    """
    model_version = await fetch_or_404(session, ModelVersion, id=model_version_id)
    validate(instance=data, schema=model_version.monitor_json_schema)
    # Asyncpg unlike psycopg2, must get for datetime columns a python datetime object
    data[SAMPLE_TS_COL] = request_timestamp = pdl.parse(data[SAMPLE_TS_COL])
    insert_statement = insert(model_version.get_monitor_table(session)).values(**data)
    await session.execute(insert_statement)
    await model_version.update_timestamps(request_timestamp, session)
    return Response(status_code=status.HTTP_201_CREATED)


@router.put("/model-versions/{model_version_id}/data", tags=[Tags.DATA])
async def update_data(
    model_version_id: int,
    data: t.Dict[t.Any, t.Any] = Body(...),
    session: AsyncSession = AsyncSessionDep
):
    """Update a single data sample.

    Parameters
    ----------
    model_version_id
    data
    session
    """
    model_version = await fetch_or_404(session, ModelVersion, id=model_version_id)

    json_schema = model_version.monitor_json_schema
    required_columns = set(json_schema["required"])
    # Create update schema, which contains only non-required columns and sample id
    optional_columns_schema = {
        "type": "object",
        "properties": {k: v for k, v in json_schema["properties"].items()
                       if k not in required_columns or k == SAMPLE_ID_COL},
        "required": [SAMPLE_ID_COL]
    }

    validate(instance=data, schema=optional_columns_schema)

    sample_id = data.pop(SAMPLE_ID_COL)

    await session.execute(
        update(model_version.get_monitor_table(session))
        .where(SAMPLE_ID_COL == sample_id).values(data)
    )

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
    model_version = await fetch_or_404(session, ModelVersion, id=model_version_id)
    ref_table = model_version.get_reference_table(session)
    count_result = await session.execute(select(count()).select_from(ref_table))
    if count_result.scalar() > 0:
        raise BadRequest("Already have reference data")

    contents = await file.read()
    data = pd.read_json(StringIO(contents.decode()), orient="table")
    if len(data) > 100_000:
        raise BadRequest(f"Maximum number of samples allowed for reference is 100,000 but got: {len(data)}")

    items = []
    for (_, row) in data.iterrows():
        item = row.to_dict()
        validate(schema=model_version.reference_json_schema, instance=item)
        items.append(item)

    await session.execute(ref_table.insert(), items)
    return Response(status_code=status.HTTP_200_OK)
