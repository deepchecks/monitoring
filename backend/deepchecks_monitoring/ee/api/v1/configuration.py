from deepchecks_monitoring.dependencies import SettingsDep
from deepchecks_monitoring.ee.config import Settings

from .routers import cloud_router


@cloud_router.get('/configurations')
async def application_configurations(settings: Settings = SettingsDep):
    return {
        'sentryDsn': settings.sentry_dsn,
        'stripeApiKey': settings.stripe_api_key,
        'lauchdarklySdkKey': settings.lauchdarkly_sdk_key,
        'enviroment': settings.enviroment,
        'mixpanel_id': settings.mixpanel_id
    }
