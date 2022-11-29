# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Package with 'Feature Flags' functionality."""
from .abc import EnvVarResolver, FeatureFlag, LauchDarklyResolver, Variation

__all__ = ["Variation", "FeatureFlag", "LauchDarklyResolver", "EnvVarResolver"]
