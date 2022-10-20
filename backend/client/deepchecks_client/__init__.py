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
"""Defines the entrance points for the client."""
from deepchecks_client.core import DeepchecksClient, TaskType
from deepchecks_client.tabular import create_schema, read_schema

__all__ = ['DeepchecksClient', 'TaskType', 'create_schema', 'read_schema']

