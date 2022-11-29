# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the alert ORM model."""
import typing as t

import pendulum as pdl
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.schema_models.base import Base

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models.alert_rule import AlertRule  # pylint: disable=unused-import

__all__ = ["Alert"]


class Alert(Base):
    """ORM model for the alert."""

    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)
    failed_values = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=pdl.now)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False, index=True)
    resolved = Column(Boolean, nullable=False, default=False, index=True)

    alert_rule_id = Column(
        Integer,
        ForeignKey("alert_rules.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
    alert_rule: Mapped["AlertRule"] = relationship(
        "AlertRule",
        back_populates="alerts"
    )
