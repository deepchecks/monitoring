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
import logging
from typing import TYPE_CHECKING, cast

from deepchecks_monitoring.ee.config import Settings, SlackSettings
from deepchecks_monitoring.ee.features_control_cloud import CloudFeaturesControl
from deepchecks_monitoring.ee.features_control_on_prem import OnPremFeaturesControl
from deepchecks_monitoring.ee.notifications import AlertNotificator as EEAlertNotificator
from deepchecks_monitoring.features_control import FeaturesControl
from deepchecks_monitoring.integrations.email import EmailSender
from deepchecks_monitoring.monitoring_utils import configure_logger
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.resources import ResourcesProvider as OpenSourceResourcesProvider

if TYPE_CHECKING:
    # pylint: disable=unused-import
    from ray.util.actor_pool import ActorPool  # noqa

__all__ = ["ResourcesProvider"]

logger: logging.Logger = configure_logger("server")


class ResourcesProvider(OpenSourceResourcesProvider):
    """Provider of resources."""

    ALERT_NOTIFICATOR_TYPE = EEAlertNotificator

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

    def get_features_control(self, user: User) -> FeaturesControl:
        """Return features control."""
        # TODO add license check -
        if self.settings.is_on_prem:
            return OnPremFeaturesControl(self.settings)
        if self.settings.is_cloud:
            return CloudFeaturesControl(user, self.settings)
        return FeaturesControl(self.settings)

    @property
    def parallel_check_executors_pool(self) -> "ActorPool | None":
        parallel_check_executor_flag = self.settings.parallel_check_executor_flag

        logger.info({
            "mesage": f"'parallelCheckExecutorEnabled' is set to {parallel_check_executor_flag}"
        })
        if parallel_check_executor_flag:
            return super().parallel_check_executors_pool

    def get_client_configuration(self) -> dict:
        if self.settings.is_cloud:
            settings = cast(Settings, self.settings)
            return {
                "environment": settings.enviroment,
                "mixpanel_id": settings.mixpanel_id,
                "is_cloud": True,
                "hotjar_id": settings.hotjar_id,
                "hotjar_sv": settings.hotjar_sv,
                "datadog_fe_token": settings.datadog_fe_token,
            }
        return super().get_client_configuration()

    def get_feature_flags(self, user: User) -> dict:
        """Return feature flags."""
        if self.settings.is_cloud:
            return {"slack_enabled": True}
        return super().get_feature_flags(user)
