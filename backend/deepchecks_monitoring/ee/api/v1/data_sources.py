# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module representing the endpoints for data sources."""
import typing as t

import boto3
import sqlalchemy as sa
from botocore.config import Config
from botocore.exceptions import BotoCoreError
from fastapi import Depends, Response
from pydantic.main import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.monitoring_utils import fetch_or_404
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.schema_models import DataSource
from deepchecks_monitoring.utils import auth

from .routers import ee_router as router


class DataSourceCreationSchema(BaseModel):
    """Data Source creation schema."""

    type: str
    parameters: t.Dict[str, t.Any]


class DataSourceSchema(DataSourceCreationSchema):
    """Data Source schema."""

    id: int

    class Config:
        orm_mode = True


@router.get('/data-sources', response_model=t.List[DataSourceSchema], tags=[Tags.DATA_SOURCES])
async def get_data_sources(session: AsyncSession = AsyncSessionDep,
                           current_user: User = Depends(auth.AdminUser())  # pylint: disable=unused-argument
                           ):
    data_sources = await session.scalars(sa.select(DataSource))
    return data_sources.all()


@router.put('/data-sources', tags=[Tags.DATA_SOURCES])
async def new_data_source(body: DataSourceCreationSchema,
                          session: AsyncSession = AsyncSessionDep,
                          current_user: User = Depends(auth.AdminUser()),  # pylint: disable=unused-argument
                          ):
    data_source = DataSource(**body.dict())
    if data_source.type == 's3':
        # Test parameters name given
        expected = {'aws_access_key_id', 'aws_secret_access_key', 'region'}
        if set(data_source.parameters.keys()) != expected:
            raise BadRequest(f'Invalid parameters for S3 data source, expected: {sorted(expected)}')
        # Test credentials to AWS
        try:
            sts = boto3.client(
                'sts',
                aws_access_key_id=data_source.parameters['aws_access_key_id'],
                aws_secret_access_key=data_source.parameters['aws_secret_access_key'],
                config=Config(region_name=data_source.parameters['region'])
            )
            sts.get_caller_identity()
        except BotoCoreError as e:
            raise BadRequest('Invalid credentials to AWS') from e
    else:
        raise BadRequest('Invalid data source type')

    session.add(data_source)
    await session.commit()
    return Response(status_code=status.HTTP_200_OK)


@router.delete('/data-sources/{data_source_id}', tags=[Tags.DATA_SOURCES])
async def delete_data_source(data_source_id: int,
                             session: AsyncSession = AsyncSessionDep,
                             current_user: User = Depends(auth.AdminUser()),  # pylint: disable=unused-argument
                             ):
    data_source = await fetch_or_404(session, DataSource, id=data_source_id)
    await session.delete(data_source)
    await session.commit()
    return Response(status_code=status.HTTP_200_OK)
