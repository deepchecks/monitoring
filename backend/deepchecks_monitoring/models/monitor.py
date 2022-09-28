# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the monitor ORM model."""
import typing as t

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.models.pydantic_type import PydanticType
from deepchecks_monitoring.utils import DataFilterList, MonitorCheckConfSchema

if t.TYPE_CHECKING:
    from deepchecks_monitoring.models.alert_rule import AlertRule  # pylint: disable=unused-import
    from deepchecks_monitoring.models.check import Check  # pylint: disable=unused-import
    from deepchecks_monitoring.models.dashboard import Dashboard  # pylint: disable=unused-import

__all__ = ["Monitor"]


class Monitor(Base):
    """ORM model for the monitor."""

    __tablename__ = "monitors"
    __table_args__ = (
        sa.CheckConstraint("frequency >= 0"),
    )
    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String(50))
    description = sa.Column(sa.String(200), default="")
    data_filters = sa.Column(PydanticType(pydantic_model=DataFilterList), nullable=True)
    lookback = sa.Column(sa.Integer)
    additional_kwargs = sa.Column(PydanticType(pydantic_model=MonitorCheckConfSchema), default=None, nullable=True)

    aggregation_window = sa.Column(sa.Integer, nullable=False)
    frequency = sa.Column(sa.Integer, nullable=False)

    latest_schedule = sa.Column(sa.DateTime(timezone=True), nullable=True)
    scheduling_start = sa.Column(sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now())

    check_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("checks.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
    check: Mapped["Check"] = relationship(
        "Check",
        back_populates="monitors"
    )

    dashboard_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("dashboards.id", ondelete="SET NULL", onupdate="RESTRICT"),
        nullable=True
    )
    dashboard: Mapped[t.Optional["Dashboard"]] = relationship(
        "Dashboard",
        back_populates="monitors"
    )

    alert_rules: Mapped[t.List["AlertRule"]] = relationship(
        "AlertRule",
        back_populates="monitor",
        cascade="save-update, merge, delete",
        passive_deletes=True,
        passive_updates=True
    )
