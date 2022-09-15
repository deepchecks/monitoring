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
"""Module with resources instatiation logic."""
import typing as t
from contextlib import asynccontextmanager, contextmanager

from aiokafka import AIOKafkaProducer
from kafka import KafkaAdminClient
from pydantic import BaseSettings
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.future.engine import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from deepchecks_monitoring.config import DatabaseSettigns, KafkaSettings
from deepchecks_monitoring.utils import ExtendedAsyncSession, json_dumps

__all__ = ["ResourcesProvider"]


class BaseResourcesProvider:
    """Base class for all resources provides."""

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args, **kwargs):
        await self.async_dispose_resources()

    async def async_dispose_resources(self):
        """Disponse async resources."""
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args, **kwargs):
        self.dispose_resources()

    def dispose_resources(self):
        """Disponse resources."""
        pass


class ResourcesProvider(BaseResourcesProvider):
    """Provider of resources."""

    # TODO:
    # consider separating into: async resources provider and sync resources provider

    settings: BaseSettings

    def __init__(self, settings: BaseSettings):
        self.settings = settings
        self._database_engine: t.Optional[Engine] = None
        self._session_factory: t.Optional[sessionmaker] = None
        self._async_database_engine: t.Optional[AsyncEngine] = None
        self._async_session_factory: t.Optional[sessionmaker] = None
        self._kafka_producer: t.Optional[AIOKafkaProducer] = None
        self._kafka_admin: t.Optional[KafkaAdminClient] = None

    @property
    def database_settings(self) -> DatabaseSettigns:
        """Return database settings."""
        if not isinstance(self.settings, DatabaseSettigns):
            raise AssertionError(
                "In order to be able to instantiate sqlalchemy resources "
                "you need to provide instance of 'DatabaseSettigns' "
                "to the 'ResourcesProvider' constructor"
            )
        return self.settings

    @property
    def kafka_settings(self) -> KafkaSettings:
        """Return kafka settings."""
        if not isinstance(self.settings, KafkaSettings):
            raise AssertionError(
                "In order to be able to instantiate kafka resources "
                "you need to provide instance of 'KafkaSettings' "
                "to the 'ResourcesProvider' constructor"
            )
        return self.settings

    def dispose_resources(self):
        """Dispose resources."""
        if self._session_factory is not None:
            self._session_factory.close_all()
        if self._database_engine is not None:
            self._database_engine.dispose()

    async def async_dispose_resources(self):
        """Dispose async resources."""
        if self._async_session_factory is not None:
            await AsyncSession.close_all()
        if self._async_database_engine is not None:
            await self._async_database_engine.dispose()

    @property
    def database_engine(self) -> Engine:
        """Return sync database engine."""
        settings = self.database_settings

        if self._database_engine is not None:
            return self._database_engine

        self._database_engine = create_engine(
            str(settings.database_uri),
            echo=settings.echo_sql,
            json_serializer=json_dumps,
            future=True,
            pool_pre_ping=True
        )

        return self._database_engine

    @property
    def session_factory(self) -> sessionmaker:
        """Return alchemy session factory."""
        if self._session_factory is None:
            self._session_factory = sessionmaker(
                self.database_engine,
                # class_=ExtendedAsyncSession,  # TODO:
                expire_on_commit=False
            )
        return self._session_factory

    @contextmanager
    def create_database_session(self) -> t.Iterator[Session]:
        """Create sqlalchemy database session."""
        with self.session_factory() as session:
            try:
                yield session
                session.commit()
            except Exception as error:
                session.rollback()
                raise error
            finally:
                session.close()

    @property
    def async_database_engine(self) -> AsyncEngine:
        """Return async sqlalchemy database engine."""
        settings = self.database_settings

        if self._async_database_engine:
            return self._async_database_engine

        self._async_database_engine = create_async_engine(
            str(settings.async_database_uri),
            echo=settings.echo_sql,
            json_serializer=json_dumps,
            pool_pre_ping=True
        )
        return self._async_database_engine

    @property
    def async_session_factory(self) -> sessionmaker:
        """Return async alchemy session maker."""
        if self._async_session_factory is None:
            self._async_session_factory = sessionmaker(
                self.async_database_engine,
                class_=ExtendedAsyncSession,
                expire_on_commit=False
            )
        return self._async_session_factory

    @asynccontextmanager
    async def create_async_database_session(self) -> t.AsyncIterator[ExtendedAsyncSession]:
        """Create async sqlalchemy database session."""
        async with self.async_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception as error:
                await session.rollback()
                raise error
            finally:
                await session.close()

    @property
    async def kafka_producer(self) -> t.Optional[AIOKafkaProducer]:
        """Return kafka producer."""
        settings = self.kafka_settings
        if settings.kafka_host is None:
            return None
        if self._kafka_producer is None:
            self._kafka_producer = AIOKafkaProducer(**settings.kafka_params)
            await self._kafka_producer.start()
        return self._kafka_producer

    @property
    def kafka_admin(self) -> t.Optional[KafkaAdminClient]:
        """Return kafka admin client. Used to manage kafka cluser."""
        settings = self.kafka_settings
        if settings.kafka_host is None:
            return None
        if self._kafka_admin is None:
            self._kafka_admin = KafkaAdminClient(**settings.kafka_params)
        return self._kafka_admin
