from deepchecks_monitoring.features_control import FeaturesControl


class OnPremFeaturesControl(FeaturesControl):
    """Feature controls class for on prem version.
    TODO: implement license check :(
    """

    async def get_allowed_models(self, session) -> None:
        return None

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
    def multi_tenant(self) -> bool:
        return False
