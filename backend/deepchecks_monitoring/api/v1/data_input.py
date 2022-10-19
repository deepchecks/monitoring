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

import fastapi
import numpy as np
import pandas as pd
from fastapi import Body, Depends, Response, UploadFile, status
from jsonschema.validators import validate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.functions import count

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, DataIngestionDep, limit_request_size
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend
from deepchecks_monitoring.models import ModelVersion
from deepchecks_monitoring.utils import fetch_or_404

from .router import router


@router.post("/model-versions/{model_version_id}/data", tags=[Tags.DATA],
             summary="Log inference data per model version.",
             description="This API logs asynchronously a batch of new samples of the inference data of an existing "
                         "model version, it requires the actual data and validates it matches the version schema.",)
async def log_data_batch(
    request: fastapi.Request,
    model_version_id: int,
    data: t.List[t.Dict[str, t.Any]] = Body(...),
    session: AsyncSession = AsyncSessionDep,
    data_ingest: DataIngestionBackend = DataIngestionDep
) -> Response:
    """Insert batch data samples.

    Parameters
    ----------
    request
    model_version_id
    data
    session
    data_ingest
    """
    if len(data) == 0:
        return Response(status_code=status.HTTP_400_BAD_REQUEST, content="Got empty list")
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id)
    await data_ingest.log(model_version, data, session, request)
    return Response(status_code=status.HTTP_200_OK)


@router.put("/model-versions/{model_version_id}/data", tags=[Tags.DATA])
async def update_data_batch(
    request: fastapi.Request,
    model_version_id: int,
    data: t.List[t.Dict[t.Any, t.Any]] = Body(...),
    session: AsyncSession = AsyncSessionDep,
    data_ingest: DataIngestionBackend = DataIngestionDep
):
    """Update data samples.

    Parameters
    ----------
    request
    model_version_id
    data
    session
    data_ingest
    """
    if len(data) == 0:
        return Response(status_code=status.HTTP_400_BAD_REQUEST, content="Got empty list")
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id)
    await data_ingest.update(model_version, data, session, request)
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
        raise BadRequest("Version already have reference data, create a new model version in order to "
                         "upload new reference data.")

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
