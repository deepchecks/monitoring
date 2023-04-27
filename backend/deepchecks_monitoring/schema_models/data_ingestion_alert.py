# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the data-ingestion alert ORM model."""
import typing as t

import pendulum as pdl
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.schema_models.base import Base

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models.model import Model  # pylint: disable=unused-import

__all__ = ["DataIngestionAlert"]


class DataIngestionAlert(Base):
    """ORM model for the alert."""

    __tablename__ = "data_ingestion_alerts"

    id = sa.Column(sa.Integer, primary_key=True)
    label_ratio = sa.Column(sa.Float)
    label_count = sa.Column(sa.Integer)
    sample_count = sa.Column(sa.Integer)
    created_at = sa.Column(sa.DateTime(timezone=True), default=pdl.now)
    start_time = sa.Column(sa.DateTime(timezone=True), nullable=False, index=True)
    end_time = sa.Column(sa.DateTime(timezone=True), nullable=False, index=True)
    resolved = sa.Column(sa.Boolean, nullable=False, default=False, index=True)

    model_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("models.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
