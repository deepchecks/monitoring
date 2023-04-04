import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.public_models import User, UserOAuthDTO
from tests.common import generate_user


@pytest.mark.asyncio
async def test_user_creation_from_oauth_info(async_session: AsyncSession, settings):
    oauth_info = UserOAuthDTO(email="user@gmail.com", name="New User")
    user = await User.from_oauth_info(info=oauth_info, session=async_session, auth_jwt_secret=settings.auth_jwt_secret)

    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    assert isinstance(user, User)
    assert user.email == oauth_info.email
    assert user.full_name == oauth_info.name
    assert user.is_admin is False
    assert user.disabled is False


@pytest.mark.asyncio
async def test_user_retrieval_with_oauth_info(async_session: AsyncSession, settings):
    user = await generate_user(async_session, with_org=False, auth_jwt_secret=settings.auth_jwt_secret)
    # initial_access_token = user.access_token
    initial_last_login = user.last_login

    oauth_info = UserOAuthDTO(email=user.email, name=user.full_name)
    retrieved_user = await User.from_oauth_info(info=oauth_info, session=async_session,
                                                auth_jwt_secret=settings.auth_jwt_secret)

    await async_session.commit()

    assert isinstance(retrieved_user, User)
    assert retrieved_user.id == user.id
    assert retrieved_user.email == user.email
    assert retrieved_user.full_name == user.full_name
    assert retrieved_user.last_login != initial_last_login
    assert retrieved_user.is_admin is False
    assert retrieved_user.disabled is False

    # TODO:
    # 'auth.create_access_token' - for same parameters it will generate the same token
    # not sure whether it is good/
    # assert retrieved_user.access_token != initial_access_token

