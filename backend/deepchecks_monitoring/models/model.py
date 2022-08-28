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
import typing as t

from sqlalchemy import Column, Enum, Integer, String
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.models.base import Base

if t.TYPE_CHECKING:
    from deepchecks_monitoring.models.check import Check  # pylint: disable=unused-import
    from deepchecks_monitoring.models.model_version import ModelVersion  # pylint: disable=unused-import


__all__ = ["TaskType", "Model"]


class TaskType(enum.Enum):
    """Enum containing supported task types."""

    REGRESSION = "regression"
    CLASSIFICATION = "classification"
    VISION_CLASSIFICATION = "vision_classification"
    VISION_DETECTION = "vision_detection"


class Model(Base):
    """ORM model for the model."""

    __tablename__ = "models"

    id = Column(Integer, primary_key=True)
    name = Column(String(50))
    description = Column(String(200))
    task_type = Column(Enum(TaskType))

    versions: Mapped[t.List["ModelVersion"]] = relationship("ModelVersion", back_populates="model",
                                                            order_by="desc(ModelVersion.end_time)")
    checks: Mapped[t.List["Check"]] = relationship("Check", back_populates="model")
