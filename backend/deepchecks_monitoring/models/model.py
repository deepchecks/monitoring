# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the model ORM model."""
import enum
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column, Enum, Integer, String, Table
from sqlalchemy.orm import relationship

from deepchecks_monitoring.models.base import Base

if TYPE_CHECKING:
    from deepchecks_monitoring.models.check import Check
    from deepchecks_monitoring.models.model_version import ModelVersion


__all__ = ["TaskType", "Model"]


class TaskType(enum.Enum):
    """Enum containing supported task types."""

    REGRESSION = "regression"
    CLASSIFICATION = "classification"


@dataclass
class Model(Base):
    """ORM model for the model."""

    __table__ = Table(
        "models",
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("name", String(50)),
        Column("description", String(200)),
        Column("task_type", Enum(TaskType))
    )
    __table_args__ = {
        "schema": "default"
    }

    id: int = None
    name: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[TaskType] = None
    versions: List["ModelVersion"] = field(default_factory=list)
    checks: List["Check"] = field(default_factory=list)

    __mapper_args__ = {  # type: ignore
        "properties": {
            "versions": relationship("ModelVersion"),
            "checks": relationship("Check"),
        }
    }
