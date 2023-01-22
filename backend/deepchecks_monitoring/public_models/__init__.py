# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the ORM models."""
from deepchecks_monitoring.schema_models import Check, ColumnType, Model, ModelVersion, TaskType
from deepchecks_monitoring.schema_models.alert import Alert
from deepchecks_monitoring.schema_models.alert_rule import AlertRule, AlertSeverity
from deepchecks_monitoring.schema_models.base import Base as MonitoringBase
from deepchecks_monitoring.schema_models.base import BaseClass as BaseDeclarative
from deepchecks_monitoring.schema_models.monitor import Monitor

from .base import Base
from .invitation import Invitation
from .organization import Organization
from .task import Task
from .user import User, UserOAuthDTO

__all__ = [
    "Base",
    "MonitoringBase",
    "Organization",
    "User",
    "UserOAuthDTO",
    "Model",
    "ModelVersion",
    "TaskType",
    "ColumnType",
    "Check",
    "Alert",
    "AlertRule",
    "AlertSeverity",
    "Monitor",
    "BaseDeclarative",
    "Invitation",
    "Task"
]
