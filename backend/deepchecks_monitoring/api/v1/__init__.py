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

from . import (alert, alert_rule, alert_webhooks, check, configuration, dashboard, data_input, e2e_support_api, model,
               model_version, monitor)
from .global_api import auth, global_router, helathcheck, organization, users
from .router import router

__all__ = ['router', 'model', 'model_version', 'data_input', 'check', 'alert', 'monitor', 'dashboard', 'alert_rule',
           'configuration', 'auth', 'helathcheck', 'organization', 'users', 'global_router', 'e2e_support_api']
