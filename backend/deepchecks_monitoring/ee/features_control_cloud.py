from sqlalchemy import select

from deepchecks_monitoring.features_control import FeaturesControl
from deepchecks_monitoring.public_models import Billing, User
from deepchecks_monitoring.public_models.role import RoleEnum


class CloudFeaturesControl(FeaturesControl):
    """Feature controls class for the cloud version."""

    def __init__(self, user: User, settings):
        super().__init__(settings)
        self.user = user
        self._allowed_models = None

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
        return RoleEnum.OWNER in self.user.roles

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
    def multi_tenant(self) -> bool:
        return True
