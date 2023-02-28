# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the Router for V1 API."""
from fastapi import APIRouter

from deepchecks_monitoring import __version__
from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.dependencies import SettingsDep

__all__ = ['router']


router = APIRouter(prefix='/api/v1')


@router.get('/say-hello')
async def hello_world() -> str:
    return 'Hello world'


@router.get('/backend-version')
async def retrieve_backend_version():
    return {'version': __version__}


@router.get('/configurations')
async def application_configurations(settings: Settings = SettingsDep):
    return {
        'sentryDsn': settings.sentry_dsn,
        'stripeApiKey': settings.stripe_api_key,
        'lauchdarklySdkKey': settings.lauchdarkly_sdk_key,
        'enviroment': settings.enviroment,
        'mixpanel_id': settings.mixpanel_id
    }
