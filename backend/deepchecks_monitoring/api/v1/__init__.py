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

from . import alert, check, data_input, model, model_version, monitor
from .router import router

__all__ = ['router', 'model', 'model_version', 'data_input', 'check', 'alert', 'monitor']
