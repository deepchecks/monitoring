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

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.schema_models.base import Base

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models.check import Check  # pylint: disable=unused-import
    from deepchecks_monitoring.schema_models.model_version import ModelVersion  # pylint: disable=unused-import


__all__ = ["TaskType", "Model"]


class TaskType(enum.Enum):
    """Enum containing supported task types."""

    REGRESSION = "regression"
    BINARY = "binary"
    MULTICLASS = "multiclass"
    VISION_CLASSIFICATION = "vision_classification"
    VISION_DETECTION = "vision_detection"


class Model(Base):
    """ORM model for the model."""

    __tablename__ = "models"

    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String(50), unique=True)
    description = sa.Column(sa.String(200))
    task_type = sa.Column(sa.Enum(TaskType))

    versions: Mapped[t.List["ModelVersion"]] = relationship(
        "ModelVersion",
        back_populates="model",
        cascade="save-update, merge, delete",
        passive_deletes=True,
        passive_updates=True,
        order_by="desc(ModelVersion.end_time)"
    )
    checks: Mapped[t.List["Check"]] = relationship(
        "Check",
        back_populates="model",
        cascade="save-update, merge, delete",
        passive_deletes=True,
        passive_updates=True,
    )
