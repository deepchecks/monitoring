"""Represent global utility functions."""
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from deepchecks_monitoring.public_models import Organization, User, UserOAuthDTO

__all__ = ['generate_random_user', 'generate_test_user']


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
