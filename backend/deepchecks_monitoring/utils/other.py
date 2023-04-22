"""Represent global utility functions."""
import typing as t
from ssl import SSLContext

import pendulum as pdl
from aiokafka.admin import AIOKafkaAdminClient
from aiokafka.admin import __version__ as aiokafka_version
from aiokafka.client import AIOKafkaClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from deepchecks_monitoring.public_models import Organization, User, UserOAuthDTO
from deepchecks_monitoring.schema_models.model_version import ModelVersion

__all__ = ['generate_random_user', 'generate_test_user', 'datetime_sample_formatter']


class ExtendedAIOKafkaAdminClient(AIOKafkaAdminClient):  # pylint: disable=missing-class-docstring
    # pylint: disable=super-init-not-called
    def __init__(self, *, loop=None,
                 bootstrap_servers: str = 'localhost',
                 client_id: str = 'aiokafka-' + aiokafka_version,
                 request_timeout_ms: int = 40000,
                 connections_max_idle_ms: int = 540000,
                 retry_backoff_ms: int = 100,
                 metadata_max_age_ms: int = 300000,
                 security_protocol: str = 'PLAINTEXT',
                 ssl_context: t.Optional[SSLContext] = None,
                 api_version: str = 'auto',
                 sasl_mechanism='PLAIN',
                 sasl_plain_username=None,
                 sasl_plain_password=None):
        self._closed = False
        self._started = False
        self._version_info = {}
        self._request_timeout_ms = request_timeout_ms
        self._client = AIOKafkaClient(
            loop=loop, bootstrap_servers=bootstrap_servers,
            client_id=client_id, metadata_max_age_ms=metadata_max_age_ms,
            request_timeout_ms=request_timeout_ms,
            retry_backoff_ms=retry_backoff_ms,
            api_version=api_version,
            ssl_context=ssl_context,
            security_protocol=security_protocol,
            connections_max_idle_ms=connections_max_idle_ms,
            sasl_mechanism=sasl_mechanism,
            sasl_plain_username=sasl_plain_username,
            sasl_plain_password=sasl_plain_password)


async def generate_random_user(session: AsyncSession, auth_jwt_secret: str, with_org: bool = True):
    """Generate a random user."""
    try:
        import faker  # pylint: disable=import-outside-toplevel
        f = faker.Faker()
        name = f.name()
        email = f.email()
        org = f.name()
    except ImportError:
        import uuid  # pylint: disable=import-outside-toplevel
        uid = uuid.uuid4().hex
        name = f'test-{uid}'
        email = f'test-{uid}@deepchecks.com'
        org = f'org-{uid}'

    u = await User.from_oauth_info(
        info=UserOAuthDTO(email=email, name=name),
        session=session,
        auth_jwt_secret=auth_jwt_secret
    )

    session.add(u)

    if with_org:
        org = await Organization.create_for_user(owner=u, name=org)
        await org.schema_builder.create(AsyncEngine(session.get_bind()))
        session.add(org)

    await session.commit()
    await session.refresh(u)
    return u


async def generate_test_user(session: AsyncSession, auth_jwt_secret: str, with_org: bool = True):
    """Generate a test user."""
    u: User = await User.from_oauth_info(
        info=UserOAuthDTO(email='e2e-testing@deepchecks.com', name='e2e-testing@deepchecks.com'),
        session=session,
        auth_jwt_secret=auth_jwt_secret
    )

    u.api_secret_hash = '$2b$12$EHG5D.HlAAmCAG/kM/eaqO8qo9VGh3o98JGvIAp6RlppffnTxI.dS'
    session.add(u)

    if with_org:
        org = await Organization.create_for_user(owner=u, name='e2e-testing@deepchecks.com',)
        await org.schema_builder.create(AsyncEngine(session.get_bind()))
        session.add(org)

    await session.commit()
    await session.refresh(u)
    return u


def datetime_sample_formatter(sample: t.Dict, model_version: ModelVersion):
    model_columns = model_version.monitor_json_schema['properties']
    for col_name, val in sample.items():
        if val is None or col_name not in model_columns:
            continue
        if model_columns[col_name].get('format') == 'date-time':
            sample[col_name] = pdl.parse(val)
