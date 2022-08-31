# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the ingestion error ORM model."""
import typing as t

import pendulum as pdl
from sqlalchemy import ARRAY, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.models.base import Base

if t.TYPE_CHECKING:
    from deepchecks_monitoring.models.model_version import ModelVersion  # pylint: disable=unused-import


__all__ = ["IngestionError"]


class IngestionError(Base):
    """ORM model for ingestion error."""

    __tablename__ = "ingestion_errors"

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime(timezone=True), default=pdl.now)
    samples_ids = Column(ARRAY(String))
    samples = Column(ARRAY(String))
    error = Column(String)

    model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=False)
    model_version: Mapped["ModelVersion"] = relationship("ModelVersion", back_populates="ingestion_errors")
