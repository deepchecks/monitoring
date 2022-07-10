# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

#  pylint: disable=redefined-outer-name
import typing as t

import pytest
import testing.postgresql
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

from deepchecks_monitoring.app import create_application
from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.config import Settings


@pytest.fixture(scope='session')
def postgres():
    with testing.postgresql.Postgresql(port=7654) as postgres:
        yield postgres


@pytest.fixture(scope='session')
def engine(postgres):
    engine = create_engine(postgres.url(), echo=True)
    yield engine
    engine.dispose()


@pytest.fixture(scope='session')
def application(postgres, engine):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    database_uri = postgres.url()
    async_database_uri = postgres.url().replace('postgresql', 'postgresql+asyncpg')
    settings = Settings(database_uri=database_uri, async_database_uri=async_database_uri)  # type: ignore
    app = create_application(settings=settings)
    return app


@pytest.fixture()
def client(application) -> t.Iterator[TestClient]:
    with TestClient(app=application) as client:
        yield client
