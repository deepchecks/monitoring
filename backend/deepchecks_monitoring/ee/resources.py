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
from typing import cast

import ldclient
from ldclient.client import LDClient
from ldclient.config import Config as LDConfig

from deepchecks_monitoring.ee import utils
from deepchecks_monitoring.ee.config import Settings, SlackSettings, StripeSettings, TelemetrySettings
from deepchecks_monitoring.ee.features_control import CloudFeaturesControl
from deepchecks_monitoring.ee.notifications import AlertNotificator as EEAlertNotificator
from deepchecks_monitoring.features_control import FeaturesControl
from deepchecks_monitoring.integrations.email import EmailSender
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.resources import ResourcesProvider as OpenSourceResourcesProvider

__all__ = ["ResourcesProvider"]


class ResourcesProvider(OpenSourceResourcesProvider):
    """Provider of resources."""

    ALERT_NOTIFICATOR_TYPE = EEAlertNotificator

    def __init__(self, settings: Settings):
        super().__init__(settings)
        self._lauchdarkly_client = None
        self._is_telemetry_initialized = False

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
    def stripe_settings(self) -> StripeSettings:
        """Get the telemetry settings."""
        if not isinstance(self._settings, StripeSettings):
            raise AssertionError(
                "Provided settings instance type is not a subclass of "
                "the 'StripeSettings', you need to provide instance "
                "of 'StripeSettings' to the 'ResourcesProvider' constructor"
            )
        return self._settings

    @property
    def email_sender(self) -> EmailSender:
        """Email sender."""
        if self._email_sender is None:
            self._email_sender = EmailSender(self.email_settings)
        return self._email_sender

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

    def initialize_telemetry_collectors(
        self,
        *targets,
        traces_sample_rate: float = 0.6,
    ):
        """Initialize telemetry."""
        settings = self.telemetry_settings

        if settings.sentry_dsn and not self._is_telemetry_initialized:
            import sentry_sdk  # pylint: disable=import-outside-toplevel

            sentry_sdk.init(
                dsn=settings.sentry_dsn,
                traces_sample_rate=traces_sample_rate,
                environment=settings.sentry_env,
                before_send_transaction=utils.sentry.sentry_send_hook
            )

            self._is_telemetry_initialized = True

        if self._is_telemetry_initialized:
            for it in targets:
                utils.telemetry.collect_telemetry(it)

    def get_client_configuration(self) -> dict:
        if self.settings.is_cloud:
            settings = cast(Settings, self.settings)
            return {
                "sentryDsn": settings.sentry_dsn,
                "stripeApiKey": settings.stripe_api_key,
                "lauchdarklySdkKey": settings.lauchdarkly_sdk_key,
                "environment": settings.enviroment,
                "mixpanel_id": settings.mixpanel_id,
                "is_cloud": True,
                "hotjar_id": settings.hotjar_id,
                "hotjar_sv": settings.hotjar_sv
            }
        return super().get_client_configuration()

    def get_feature_flags(self, user: User) -> dict:
        """Return feature flags."""
        if self.settings.is_cloud:
            return {"slack_enabled": True}
        return super().get_feature_flags(user)
