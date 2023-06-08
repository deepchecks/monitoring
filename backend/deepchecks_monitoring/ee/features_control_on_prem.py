from deepchecks_monitoring.features_control import FeaturesControl


class OnPremFeaturesControl(FeaturesControl):
    """Feature controls class for on prem version.
    TODO: implement license check :(
    """

    @property
    def max_models(self) -> int:
        return 9999

    async def get_allowed_models(self, session) -> int:
        return 10

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
    def custom_checks_enabled(self) -> bool:
        return False

    @property
    def data_retention_months(self) -> int:
        return 12

    @property
    def monthly_predictions_limit(self) -> int:
        return 10_000_000

    @property
    def sso_enabled(self) -> bool:
        return False

    @property
    def multi_tenant(self) -> bool:
        return False
