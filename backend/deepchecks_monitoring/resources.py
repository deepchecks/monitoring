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

import ldclient
import requests
from aiokafka import AIOKafkaProducer
from authlib.integrations.starlette_client import OAuth
from kafka import KafkaAdminClient
from kafka.admin import NewTopic
from kafka.errors import TopicAlreadyExistsError
from ldclient.client import LDClient
from ldclient.config import Config as LDConfig
from pydantic.env_settings import BaseSettings
from redis.client import Redis
from redis.cluster import RedisCluster
from redis.exceptions import RedisClusterException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.future.engine import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from deepchecks_monitoring.config import DatabaseSettings, KafkaSettings, RedisSettings, Settings
from deepchecks_monitoring.integrations.email import EmailSender
from deepchecks_monitoring.logic.cache_functions import CacheFunctions
from deepchecks_monitoring.monitoring_utils import ExtendedAsyncSession, json_dumps

__all__ = ["ResourcesProvider"]

from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.utils import database


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

    def __init__(self, settings: BaseSettings, cache_functions_class=None):
        self.settings = settings
        self.cache_functions_class = cache_functions_class
        self._database_engine: t.Optional[Engine] = None
        self._session_factory: t.Optional[sessionmaker] = None
        self._async_database_engine: t.Optional[AsyncEngine] = None
        self._async_session_factory: t.Optional[sessionmaker] = None
        self._kafka_producer: t.Optional[AIOKafkaProducer] = None
        self._kafka_admin: t.Optional[KafkaAdminClient] = None
        self._redis_client: t.Optional[Redis] = None
        self._cache_funcs: t.Optional[CacheFunctions] = None
        self._lauchdarkly_client: t.Optional[LDClient] = None
        self._email_sender: t.Optional[EmailSender] = None
        self._oauth_client: t.Optional[OAuth] = None
        self._topics = set()

    @property
    def database_settings(self) -> DatabaseSettings:
        """Return database settings."""
        if not isinstance(self.settings, DatabaseSettings):
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

    @property
    def redis_settings(self) -> RedisSettings:
        """Get the redis settings."""
        if not isinstance(self.settings, RedisSettings):
            raise AssertionError(
                "In order to be able to instantiate redis resources "
                "you need to provide instance of 'RedisSettings' "
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
        # if self._async_session_factory is not None:
        #     await AsyncSession.close_all()
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
        with self.session_factory() as session:  # pylint: disable=not-callable
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
    async def create_async_database_session(self, organization_id=None) -> t.AsyncIterator[ExtendedAsyncSession]:
        """Create async sqlalchemy database session."""
        async with self.async_session_factory() as session:  # pylint: disable=not-callable
            try:
                if organization_id:
                    organization_schema = (await session.execute(
                        select(Organization.schema_name).where(Organization.id == organization_id)
                    )).scalar_one_or_none()

                    # If can't find organization return none
                    if organization_schema is None:
                        await session.close()
                        yield
                        return
                    await database.attach_schema_switcher_listener(
                        session=session,
                        schema_search_path=[organization_schema, "public"]
                    )
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

    @property
    def redis_client(self) -> t.Optional[Redis]:
        """Return redis client if redis defined, else None."""
        if self._redis_client is None and self.redis_settings.redis_uri:
            try:
                self._redis_client = RedisCluster.from_url(self.redis_settings.redis_uri)
            except RedisClusterException:
                self._redis_client = Redis.from_url(self.redis_settings.redis_uri)
        return self._redis_client

    @property
    def cache_functions(self) -> t.Optional[CacheFunctions]:
        """Return cache functions."""
        if self._cache_funcs is None and self.cache_functions_class:
            self._cache_funcs = self.cache_functions_class(self.redis_client)
        return self._cache_funcs

    @property
    def lauchdarkly_client(self) -> LDClient:
        """Launchdarkly client."""
        if not isinstance(self.settings, Settings):
            raise AssertionError(
                "In order to be able to instantiate launch darkly resources "
                "you need to provide instance of 'Settings' "
                "to the 'ResourcesProvider' constructor"
            )
        if self._lauchdarkly_client:
            return self._lauchdarkly_client

        ldclient.set_config(LDConfig(self.settings.lauchdarkly_sdk_key))
        self._lauchdarkly_client = ldclient.get()
        return self._lauchdarkly_client

    def launchdarkly_variation(self, flag, user, default=False) -> bool:
        """Return variation of a flag."""
        ld_user = {"email": user.email, "key": user.email}
        return self.lauchdarkly_client.variation(flag, ld_user, default)

    @property
    def oauth_client(self):
        """Oauth client."""
        if not isinstance(self.settings, Settings):
            raise AssertionError(
                "In order to be able to instantiate OAuth resources "
                "you need to provide instance of 'Settings' "
                "to the 'ResourcesProvider' constructor"
            )

        if self._oauth_client is None:
            try:
                url = f"https://{self.settings.oauth_domain}/.well-known/openid-configuration"
                openid_configuration = requests.get(url).json()
                self._oauth_client = OAuth()
                self._oauth_client.register(
                    name="auth0",
                    client_id=self.settings.oauth_client_id,
                    client_secret=self.settings.oauth_client_secret,
                    access_token_url=openid_configuration["token_endpoint"],
                    access_token_params=None,
                    authorize_url=openid_configuration["authorization_endpoint"],
                    authorize_params={"prompt": "login"},
                    jwks_uri=f"https://{self.settings.oauth_domain}/.well-known/jwks.json",
                    client_kwargs={"scope": "openid profile email"},
                )
            except Exception as e:
                raise Exception("There was an error while trying to get the OpenID configuration from the server.") \
                    from e
        return self._oauth_client

    @property
    def email_sender(self) -> EmailSender:
        """Email sender."""
        if self._email_sender is None:
            self._email_sender = EmailSender(self.settings)
        return self._email_sender

    def ensure_kafka_topic(self, topic_name, num_partitions=1) -> bool:
        """Ensure that kafka topic exist. If not, creating it.

        Returns
        -------
        bool
            True if topic existed, False if was created
        """
        if topic_name in self._topics:
            return True
        # Refresh the topics list from the server
        kafka_admin: KafkaAdminClient = self.kafka_admin
        self._topics = set(kafka_admin.list_topics())
        if topic_name in self._topics:
            return True

        # If still doesn't exist try to create
        try:
            kafka_admin.create_topics([
                NewTopic(name=topic_name, num_partitions=num_partitions,
                         replication_factor=self.kafka_settings.kafka_replication_factor)
            ])
            self._topics.add(topic_name)
            return False
        # 2 workers might try to create topic at the same time so ignoring if already exists
        except TopicAlreadyExistsError:
            return True
