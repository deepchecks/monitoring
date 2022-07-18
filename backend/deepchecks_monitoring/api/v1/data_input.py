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
from io import StringIO

import pandas as pd
import pendulum as pdl
from fastapi import Body, Depends, Response, UploadFile
from jsonschema import validate
from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.functions import count
from starlette.status import HTTP_200_OK

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.logic.data_tables import SAMPLE_ID_COL, SAMPLE_TS_COL
from deepchecks_monitoring.models import ModelVersion
from deepchecks_monitoring.schemas.data_input import ReferenceDataSchema
from deepchecks_monitoring.utils import bad_request, fetch_or_404, limit_request_size

from .router import router


@router.post("/data/{model_version_id}/log")
async def log_data(
    model_version_id: int,
    request_body: dict = Body(...),
    session: AsyncSession = AsyncSessionDep
):
    """Insert single data sample.

    Parameters
    ----------
    model_version_id
    request_body
    session
    """
    model_version = await fetch_or_404(session, ModelVersion, id=model_version_id)

    validate(instance=request_body, schema=model_version.monitor_json_schema)

    # Save sample
    i = insert(model_version.get_monitor_table(session))
    # Asyncpg unlike psycopg2, must get for datetime columns a python datetime object
    request_timestamp = pdl.parse(request_body[SAMPLE_TS_COL])
    request_body[SAMPLE_TS_COL] = request_timestamp
    i = i.values(**request_body)
    await session.execute(i)
    await model_version.update_timestamps(request_timestamp, session)

    return Response(status_code=HTTP_200_OK)


@router.post("/data/{model_version_id}/update")
async def update_data(
    model_version_id: int,
    request_body: dict = ReferenceDataSchema,
    session: AsyncSession = AsyncSessionDep
):
    """Update a single data sample.

    Parameters
    ----------
    model_version_id
    request_body
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

    validate(instance=request_body, schema=optional_columns_schema)

    sample_id = request_body.pop(SAMPLE_ID_COL)
    connection = await session.connection()
    statement = update(model_version.get_monitor_table(connection))\
        .where(SAMPLE_ID_COL == sample_id).values(request_body)
    await session.execute(statement)

    return Response(status_code=HTTP_200_OK)


@router.get("/data/{model_version_id}/schema")
async def get_schema(
    model_version_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Return json schema of the model version data to use in validation on client-side.

    Parameters
    ----------
    model_version_id
    session

    Returns
    -------
    json schema of the model version
    """
    model_version = await fetch_or_404(session, ModelVersion, id=model_version_id)
    return model_version.monitor_json_schema


@router.get("/data/{model_version_id}/reference_schema")
async def get_reference_schema(
    model_version_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Return json schema of the model version data to use in validation on client-side.

    Parameters
    ----------
    model_version_id
    session

    Returns
    -------
    json schema of the model version
    """
    model_version = await fetch_or_404(session, ModelVersion, id=model_version_id)
    return model_version.reference_json_schema


@router.post("/data/{model_version_id}/reference",
             dependencies=[Depends(limit_request_size(500_000_000))])
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
        bad_request("Already have reference data")

    contents = await file.read()
    data = pd.read_json(StringIO(contents.decode()), orient="table")
    if len(data) > 100_000:
        bad_request(f"Maximum number of samples allowed for reference is 100,000 but got: {len(data)}")

    items = []
    for (_, row) in data.iterrows():
        item = row.to_dict()
        validate(schema=model_version.reference_json_schema, instance=item)
        items.append(item)

    # Insert all
    await session.execute(ref_table.insert(), items)
    return Response(status_code=HTTP_200_OK)
