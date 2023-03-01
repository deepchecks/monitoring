# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#  pylint: disable=unnecessary-ellipsis
"""Module with resources instatiation logic."""

from deepchecks_monitoring.config import BaseSettings
from deepchecks_monitoring.ee.config import EmailSettings, TelemetrySettings
from deepchecks_monitoring.ee.integrations.email import EmailSender
from deepchecks_monitoring.ee.integrations.slack import SlackSender
from deepchecks_monitoring.resources import ResourcesProvider as OpenSourceResourcesProvider

__all__ = ["ResourcesProvider"]


class ResourcesProvider(OpenSourceResourcesProvider):
    """Provider of resources."""

    def __init__(self, settings: BaseSettings):
        super().__init__(settings)

    @property
    def email_settings(self) -> EmailSettings:
        """Get the email settings."""
        if not isinstance(self._settings, EmailSettings):
            raise AssertionError(
                "In order to be able to use email resources "
                "you need to provide instance of 'EmailSettings' "
                "to the 'ResourcesProvider' constructor"
            )
        return self._settings

    @property
    def telemetry_settings(self) -> TelemetrySettings:
        """Get the telemetry settings."""
        if not isinstance(self._settings, TelemetrySettings):
            raise AssertionError(
                "Provided settings instance type is not a subclass of "
                "the 'TelemetrySettings', you need to provide instance "
                "of 'TelemetrySettings' to the 'ResourcesProvider' constructor"
            )
        return self._settings

    @property
    def email_sender(self) -> EmailSender:
        """Email sender."""
        if self._email_sender is None:
            self._email_sender = EmailSender(self.email_settings)
        return self._email_sender

    @property
    def slack_sender(self) -> SlackSender:
        """Slack sender."""
        if self._slack_sender is None:
            self._slack_sender = SlackSender(self.settings)
        return self._slack_sender
