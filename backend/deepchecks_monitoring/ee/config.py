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

from pydantic import SecretStr, validator

from deepchecks_monitoring.config import BaseDeepchecksSettings
from deepchecks_monitoring.config import Settings as OpenSourceSettings

__all__ = [
    'Settings',
    'TelemetrySettings',
    'EmailSettings',
    'StripeSettings',
    'SlackSettings'
]


PROJECT_DIR = pathlib.Path(__file__).parent.parent.absolute()


class EmailSettings(BaseDeepchecksSettings):
    """Settings for mail service."""

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


class SlackSettings(BaseDeepchecksSettings):
    """Settings for Slack."""

    slack_client_id: str
    slack_client_secret: SecretStr
    slack_scopes: str
    slack_state_ttl: int = 300

    @validator('slack_scopes')
    def validate_scopes(cls, value: str):  # pylint: disable=no-self-argument
        """Validate scopes of slack."""
        minimal_required_scopes = ['chat:write', 'incoming-webhook']
        assert all(it in value for it in minimal_required_scopes)
        return value


class Settings(
    OpenSourceSettings,
    EmailSettings,
    SlackSettings,
    TelemetrySettings,
    StripeSettings
):
    """Settings for the deepchecks_monitoring package."""

    enviroment: str = 'dev'
    debug_mode: bool = False
    lauchdarkly_sdk_key: str = ''
    oauth_domain: str
    oauth_client_id: str
    oauth_client_secret: str
    access_audit: bool = False
    mixpanel_id: str = ''
