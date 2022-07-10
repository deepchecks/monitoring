import logging
from pydantic import BaseSettings, PostgresDsn, Field

__all__ = ['Settings']


logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    database_uri: PostgresDsn
    async_database_uri: PostgresDsn
    echo_sql: bool = True

    # jwt_secret_key: str = Field(..., env='SECRET_KEY')
    # jwt_algorithm: str = Field(..., env='ALGORITHM')
    # jwt_access_token_expire_minutes: int = Field(..., env='ACCESS_TOKEN_EXPIRE_MINUTES')

    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'
