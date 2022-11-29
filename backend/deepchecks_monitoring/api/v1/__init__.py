# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the v1 API of the app."""

from . import alert, alert_rule, check, configuration, dashboard, data_input, model, model_version, monitor, slack
from .global_api import auth, global_router, helathcheck, organization, users
from .router import router

__all__ = ['router', 'model', 'model_version', 'data_input', 'check', 'alert', 'monitor', 'dashboard', 'alert_rule',
           'configuration', 'auth', 'helathcheck', 'organization', 'slack', 'users', 'global_router']
