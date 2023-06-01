from ldclient import Context
from ldclient.client import LDClient
from pydantic import BaseModel
from sqlalchemy import select

from deepchecks_monitoring.features_control import FeaturesControl
from deepchecks_monitoring.public_models import Billing, User


class TierConfSchema(BaseModel):
    """Tier configuration which is loaded from launchdarkly."""

    custom_checks: bool = False
    data_retention_months: int = 3
    max_models: int = 1
    monthly_predictions_limit: int = 500_000
    sso: bool = False
    rows_per_minute: int = 500_000
    update_roles: bool = False
    model_assignment: bool = False


class CloudFeaturesControl(FeaturesControl):
    """Feature controls class for the cloud version."""

    def __init__(self, user: User, ld_client: LDClient, settings):
        super().__init__(settings)
        self.user = user
        self.ld_client = ld_client
        self._max_models = None
        self._allowed_models = None
        self._rows_per_minute = None
        self._custom_checks_enabled = None
        self._data_retention_months = None
        self._monthly_predictions_limit = None
        self._sso_enabled = None
        self._signup_enabled = None
        self._onboarding_enabled = None
        self._update_roles = None
        self._model_assignment = None

    @property
    def max_models(self) -> int:
        if self._max_models is None:
            self._load_tier()
        return self._max_models

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
        if self._update_roles is None:
            self._load_tier()
        return self._update_roles

    @property
    def model_assignment(self) -> bool:
        if self._model_assignment is None:
            self._load_tier()
        return self._model_assignment

    @property
    def signup_enabled(self) -> bool:
        if self._signup_enabled is None:
            self._load_tier()
        return self._signup_enabled

    @property
    def onboarding_enabled(self) -> bool:
        if self._onboarding_enabled is None:
            self._load_tier()
        return self._onboarding_enabled

    @property
    def slack_enabled(self) -> bool:
        return True

    @property
    def rows_per_minute(self) -> int:
        if self._rows_per_minute is None:
            self._load_tier()
        return self._rows_per_minute

    @property
    def custom_checks_enabled(self) -> bool:
        if self._custom_checks_enabled is None:
            self._load_tier()
        return self._custom_checks_enabled

    @property
    def data_retention_months(self) -> int:
        if self._data_retention_months is None:
            self._load_tier()
        return self._data_retention_months

    @property
    def monthly_predictions_limit(self) -> int:
        if self._monthly_predictions_limit is None:
            self._load_tier()
        return self._monthly_predictions_limit

    @property
    def sso_enabled(self) -> bool:
        if self._sso_enabled is None:
            self._load_tier()
        return self._sso_enabled

    @property
    def multi_tenant(self) -> bool:
        return True

    def _load_tier(self):
        context = Context.builder(self.user.email).set("email", self.user.email)
        if self.user.organization:
            context.set("organization_id", self.user.organization.id)
            context.set("tier", self.user.organization.tier)

        ld_user = context.build()
        tier_conf = self.ld_client.variation("paid-features", ld_user, default={})
        self._signup_enabled = self.ld_client.variation("signUpEnabled", ld_user, default=True)
        tier_conf = TierConfSchema(**tier_conf)
        self._custom_checks_enabled = tier_conf.custom_checks
        self._data_retention_months = tier_conf.data_retention_months
        self._max_models = tier_conf.max_models
        self._monthly_predictions_limit = tier_conf.monthly_predictions_limit
        self._sso_enabled = tier_conf.sso
        self._rows_per_minute = tier_conf.rows_per_minute
        self._update_roles = tier_conf.update_roles
        self._model_assignment = tier_conf.model_assignment
        self._onboarding_enabled = self.ld_client.variation("onBoardingEnabled", ld_user, default=False)
