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

import ldclient
from ldclient.client import LDClient
from ldclient.config import Config as LDConfig

from deepchecks_monitoring.ee.config import EmailSettings, Settings, SlackSettings, TelemetrySettings
from deepchecks_monitoring.ee.features_control import CloudFeaturesControl
from deepchecks_monitoring.ee.integrations.email import EmailSender
from deepchecks_monitoring.ee.integrations.slack import SlackSender
from deepchecks_monitoring.features_control import FeaturesControl
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.resources import ResourcesProvider as OpenSourceResourcesProvider

__all__ = ["ResourcesProvider"]


class ResourcesProvider(OpenSourceResourcesProvider):
    """Provider of resources."""

    def __init__(self, settings: Settings):
        super().__init__(settings)
        self._lauchdarkly_client = None

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
    def slack_settings(self) -> SlackSettings:
        """Get the telemetry settings."""
        if not isinstance(self._settings, SlackSettings):
            raise AssertionError(
                "Provided settings instance type is not a subclass of "
                "the 'SlackSettings', you need to provide instance "
                "of 'SlackSettings' to the 'ResourcesProvider' constructor"
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
            self._slack_sender = SlackSender(self.slack_settings)
        return self._slack_sender

    @property
    def lauchdarkly_client(self) -> LDClient:
        """Launchdarkly client."""
        if self.settings.is_cloud is False:
            raise Exception("Launchdarkly client is only available in cloud mode")
        if self._lauchdarkly_client:
            return self._lauchdarkly_client
        ldclient.set_config(LDConfig(self.settings.lauchdarkly_sdk_key))
        self._lauchdarkly_client = ldclient.get()
        return self._lauchdarkly_client

    def get_features_control(self, user: User) -> FeaturesControl:
        """Return features control."""
        if self.settings.is_cloud:
            return CloudFeaturesControl(user, self.lauchdarkly_client)
        return FeaturesControl()
