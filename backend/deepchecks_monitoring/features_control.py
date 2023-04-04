# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module for the features control."""
from pydantic import BaseModel

__all__ = ["FeaturesControl", "FeaturesSchema"]


class FeaturesSchema(BaseModel):
    """Schema to be returned to the client for the features control."""

    max_models: int
    signup_enabled: bool
    slack_enabled: bool
    rows_per_minute: int
    custom_checks_enabled: bool
    data_retention_months: int
    monthly_predictions_limit: int
    sso_enabled: bool


class FeaturesControl:
    """Features control class with default parameters for the open source version."""

    def __init__(self, *args, **kwargs):
        pass

    @property
    def max_models(self) -> int:
        """Maximum number of models allowed for organization."""
        return 1

    async def get_allowed_models(self, session) -> int:  # pylint: disable=unused-argument
        """For the cloud, number of models which are allowed by subscription."""
        return 1

    @property
    def signup_enabled(self) -> bool:
        """Whether signup is enabled."""
        return True

    @property
    def slack_enabled(self) -> bool:
        """Whether slack is enabled."""
        return False

    @property
    def rows_per_minute(self) -> int:
        """Maximum number of rows per minute allowed for organization."""
        return 500_000

    @property
    def custom_checks_enabled(self) -> bool:
        """Whether custom checks are enabled."""
        return False

    @property
    def data_retention_months(self) -> int:
        """Get number of months to keep data for."""
        return 3

    @property
    def monthly_predictions_limit(self) -> int:
        """Maximum number of predictions per month allowed for organization."""
        return 500_000

    @property
    def sso_enabled(self) -> bool:
        """Whether SSO is enabled."""
        return False

    @property
    def multi_tenant(self) -> bool:
        """Whether multi-tenant is enabled."""
        return False

    def get_all_features(self) -> FeaturesSchema:
        """Get all features for the client."""
        return FeaturesSchema(
            max_models=self.max_models,
            signup_enabled=self.signup_enabled,
            slack_enabled=self.slack_enabled,
            rows_per_minute=self.rows_per_minute,
            custom_checks_enabled=self.custom_checks_enabled,
            data_retention_months=self.data_retention_months,
            monthly_predictions_limit=self.monthly_predictions_limit,
            sso_enabled=self.sso_enabled,
        )
