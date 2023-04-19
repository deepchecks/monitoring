# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the configuration for the deepchecks_monitoring package."""
import pathlib
import secrets
import typing as t
from enum import Enum

from aiokafka.helpers import create_ssl_context
from pydantic import BaseSettings, PostgresDsn, RedisDsn
from pydantic.networks import AnyHttpUrl

__all__ = [
    'Settings',
    'tags_metadata',
    'Tags',
    'DatabaseSettings',
    'RedisSettings',
    'KafkaSettings',
    'BaseDeepchecksSettings',
    'EmailSettings'
]


PROJECT_DIR = pathlib.Path(__file__).parent.parent.absolute()


class BaseDeepchecksSettings(BaseSettings):
    """Base class for all config classes."""

    def __init__(self, *args, **kwargs):  # pylint: disable=useless-super-delegation
        super().__init__(*args, **kwargs)

    class Config:
        """Settings configuration."""

        env_file = '.env'
        env_file_encoding = 'utf-8'


class EmailSettings(BaseDeepchecksSettings):
    """Settings for mail service."""

    deepchecks_email: str = 'app@deepchecks.com'
    email_smtp_host: t.Optional[str]
    email_smtp_port: int = 25
    email_smtp_username: t.Optional[str]
    email_smtp_password: t.Optional[str]


class KafkaSettings(BaseDeepchecksSettings):
    """Settings for kafka usage for data ingestion."""

    kafka_host: t.Optional[str] = None
    kafka_security_protocol: t.Optional[str] = None
    kafka_sasl_mechanism: t.Optional[str] = None
    kafka_username: t.Optional[str] = None
    kafka_password: t.Optional[str] = None
    kafka_replication_factor: int = 1
    kafka_max_metadata_age: int = 60 * 1000

    @property
    def kafka_params(self):
        """Get connection parameters for kafka."""
        return {
            'bootstrap_servers': self.kafka_host,
            'security_protocol': self.kafka_security_protocol,
            'sasl_mechanism': self.kafka_sasl_mechanism,
            'sasl_plain_username': self.kafka_username,
            'sasl_plain_password': self.kafka_password,
            'ssl_context': create_ssl_context(),
            'metadata_max_age_ms': self.kafka_max_metadata_age
        }

    @property
    def kafka_admin_params(self):
        """Get connection parameters for kafka admin."""
        return {
            'bootstrap_servers': self.kafka_host,
            'security_protocol': self.kafka_security_protocol,
            'ssl_context': create_ssl_context(),
            'metadata_max_age_ms': self.kafka_max_metadata_age
        }


class DatabaseSettings(BaseDeepchecksSettings):
    """Database settings."""

    database_uri: PostgresDsn
    echo_sql: bool = False

    @property
    def async_database_uri(self) -> PostgresDsn:
        """Return async postgres connection string."""
        return t.cast(PostgresDsn, self.database_uri.replace(
            'postgresql',
            'postgresql+asyncpg'
        ))


class RedisSettings(BaseDeepchecksSettings):
    """Redis settings."""

    redis_uri: t.Optional[RedisDsn] = None


class Settings(
    DatabaseSettings,
    EmailSettings,
    KafkaSettings,
    RedisSettings
):
    """Settings for the deepchecks_monitoring package."""

    assets_folder: pathlib.Path = PROJECT_DIR / 'assets'
    is_cloud: bool = False
    deployment_url: AnyHttpUrl = 'http://localhost:8000'
    auth_jwt_secret: t.Optional[str] = secrets.token_hex(20)
    oauth_url: AnyHttpUrl
    oauth_client_id: str
    oauth_client_secret: str


class Tags(Enum):
    """Tags for the deepchecks_monitoring package."""

    MODELS = 'Models'
    CHECKS = 'Checks'
    MONITORS = 'Monitors'
    ALERTS = 'Alerts'
    DATA = 'Data'
    CONFIG = 'Configuration'


tags_metadata = [
    {
        'name': Tags.MODELS.value,
        'description': 'APIs for interacting with model entities.'
    },
    {
        'name': Tags.CHECKS.value,
        'description': 'APIs for interacting with check entities. Includes adding/updating checks, '
                       'and retrieving check results.',
    },
    {
        'name': Tags.MONITORS.value,
        'description': 'APIs for interacting with monitor entities. Includes adding/updating monitors within a '
                       'dashboard, getting dasbboard data, and retrieving monitor results.',
    },
    {
        'name': Tags.ALERTS.value,
        'description': 'APIs for interacting with alert/alert-rule entities. Includes adding/updating alert-rules, '
                       'and retrieving/counting active alerts results.'
    },
    {
        'name': Tags.DATA.value,
        'description': 'APIs for sending data to the deepchecks_monitoring service.'
    }
]
