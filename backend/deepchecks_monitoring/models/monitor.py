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

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.models.pydantic_type import PydanticType
from deepchecks_monitoring.utils import DataFilterList

if t.TYPE_CHECKING:
    from deepchecks_monitoring.models.alert_rule import AlertRule  # pylint: disable=unused-import
    from deepchecks_monitoring.models.check import Check  # pylint: disable=unused-import
    from deepchecks_monitoring.models.dashboard import Dashboard  # pylint: disable=unused-import

__all__ = ["Monitor"]


class Monitor(Base):
    """ORM model for the monitor."""

    __tablename__ = "monitors"

    id = Column(Integer, primary_key=True)
    name = Column(String(50))
    description = Column(String(200), default="")
    data_filters = Column(PydanticType(pydantic_model=DataFilterList), nullable=True)
    lookback = Column(Integer)
    filter_key = Column(String(50), default=None, nullable=True)

    check_id = Column(
        Integer,
        ForeignKey("checks.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
    check: Mapped["Check"] = relationship(
        "Check",
        back_populates="monitors"
    )

    dashboard_id = Column(
        Integer,
        ForeignKey("dashboards.id", ondelete="SET NULL", onupdate="RESTRICT"),
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
