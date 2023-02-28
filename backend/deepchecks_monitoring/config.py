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
import typing as t
from enum import Enum

from aiokafka.helpers import create_ssl_context
from pydantic import BaseSettings, PostgresDsn, RedisDsn
from pydantic.networks import AnyHttpUrl

from deepchecks_monitoring.utils.slack import SlackSettings

__all__ = [
    'Settings',
    'tags_metadata',
    'Tags',
    'DatabaseSettings',
    'RedisSettings',
    'KafkaSettings',
    'TelemetrySettings'
]


PROJECT_DIR = pathlib.Path(__file__).parent.parent.absolute()


class BaseDeepchecksSettings(BaseSettings):

    def __init__(self, *args, **kwargs):  # pylint: disable=useless-super-delegation
        super().__init__(*args, **kwargs)

    class Config:
        """Settings configuration."""

        env_file = '.env'
        env_file_encoding = 'utf-8'


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


class EmailSettings(BaseDeepchecksSettings):
    """Settings for mail service."""

    host: AnyHttpUrl  # TODO: consider moving to Settings
    deepchecks_email: str = 'app@deepchecks.com'
    email_smtp_host: str
    email_smtp_port: int = 25
    email_smtp_username: str
    email_smtp_password: str


class TelemetrySettings(BaseDeepchecksSettings):
    """Telemetry settings."""

    instrument_telemetry: bool = False
    sentry_dsn: t.Optional[str] = None
    sentry_env: str = 'dev'


class StripeSettings(BaseDeepchecksSettings):
    """Stripe settings."""

    stripe_api_key: str = ''
    stripe_webhook_secret: str = ''


class Settings(
    DatabaseSettings,
    KafkaSettings,
    RedisSettings,
    EmailSettings,
    SlackSettings,
    TelemetrySettings,
    StripeSettings
):
    """Settings for the deepchecks_monitoring package."""

    enviroment: str = 'dev'
    assets_folder: pathlib.Path = PROJECT_DIR / 'assets'
    debug_mode: bool = False
    lauchdarkly_sdk_key: str = ''
    oauth_domain: str
    oauth_client_id: str
    oauth_client_secret: str
    auth_jwt_secret: str
    access_audit: bool = False
    mixpanel_id: str = ''


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
