from sqlalchemy import select

from deepchecks_monitoring.features_control import FeaturesControl
from deepchecks_monitoring.public_models import Billing, User


class OnPremFeaturesControl(FeaturesControl):
    """Feature controls class for on prem version.
    TODO: implement license check :(
    """

    async def get_allowed_models(self, session) -> int:
        if self._allowed_models is None:
            self._allowed_models = await session.scalar(
                select(Billing.bought_models).where(Billing.organization_id == self.user.organization_id)
            )
        if self._allowed_models is None:
            return 1

        return self._allowed_models + 1

    @property
    def update_roles(self) -> bool:
        return True

    @property
    def model_assignment(self) -> bool:
        return True

    @property
    def signup_enabled(self) -> bool:
        return True

    @property
    def onboarding_enabled(self) -> bool:
        return True

    @property
    def slack_enabled(self) -> bool:
        return True

    @property
    def rows_per_minute(self) -> int:
        return 500_000

    @property
    def data_retention_months(self) -> int:
        return 12

    @property
    def monthly_predictions_limit(self) -> int:
        return 10_000_000

    @property
    def multi_tenant(self) -> bool:
        return False
