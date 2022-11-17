# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#
"""Module defining the tabular client functionality."""
from deepchecks.tabular.utils.task_type import TaskType as DeepchecksTaskType
from deepchecks_client.tabular.utils import create_schema, read_schema

__all__ = ['create_schema', 'read_schema']
