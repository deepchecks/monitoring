"""Represent global utility functions."""
import random
import typing as t

import pendulum as pdl
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from deepchecks_monitoring.public_models import Organization, User, UserOAuthDTO
from deepchecks_monitoring.schema_models.model_version import ModelVersion

__all__ = ['generate_random_user', 'generate_test_user', 'datetime_sample_formatter']


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


def sentry_send_hook(event, *args, **kwargs):  # pylint: disable=unused-argument
    """Sentry transaction send hook.

    Sentry "N+1 DB queries" detector incorrectly identifies a load of monitoring
    data during monitor execution as the 'N+1' problem, to prevent this we add a
    random integer number at the end of each query that loads monitoring data.
    """
    if event.get('type') == 'transaction':
        for span in event.get('spans', tuple()):
            if (
                span.get('op') in ['db', 'db.query', 'db.sql.query']
                and '_monitor_data_' in span.get('description', '')
            ):
                i = random.randint(0, 100)
                span['description'] = f'{span["description"]} -- rand: {i}, prevent sentry from N+1 detection'
    return event
