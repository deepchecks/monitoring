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

import pendulum as pdl
import sqlalchemy as sa
from sqlalchemy.engine.default import DefaultExecutionContext
from sqlalchemy.future import select
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.monitoring_utils import DataFilterList, MonitorCheckConfSchema
from deepchecks_monitoring.schema_models.base import Base
from deepchecks_monitoring.schema_models.pydantic_type import PydanticType

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models.alert_rule import AlertRule  # pylint: disable=unused-import
    from deepchecks_monitoring.schema_models.check import Check  # pylint: disable=unused-import
    from deepchecks_monitoring.schema_models.dashboard import Dashboard  # pylint: disable=unused-import

__all__ = ["Monitor", "NUM_WINDOWS_TO_START"]

NUM_WINDOWS_TO_START = 14


def _get_start_schedule_time(context: DefaultExecutionContext):
    # pylint: disable=import-outside-toplevel, redefined-outer-name
    from deepchecks_monitoring.logic.monitor_alert_logic import floor_window_for_time
    from deepchecks_monitoring.schema_models.check import Check
    from deepchecks_monitoring.schema_models.model import Model

    check_id = context.get_current_parameters()["check_id"]
    frequency = context.get_current_parameters()["frequency"]

    select_obj = (
        select(Model.start_time, Model.end_time)
        .join(Check, Check.id == check_id)
        .where(Model.id == Check.model_id)
    )

    record = context.connection.execute(select_obj).first()
    start_time, end_time = record[0], record[1]
    # This indicates there is still no data for the model
    if end_time < start_time:
        time = pdl.now().subtract(seconds=frequency * NUM_WINDOWS_TO_START)
    else:
        time = max(pdl.instance(start_time),
                   pdl.instance(end_time).subtract(seconds=frequency * NUM_WINDOWS_TO_START))
    return floor_window_for_time(time, frequency)


class Monitor(Base):
    """ORM model for the monitor."""

    __tablename__ = "monitors"
    __table_args__ = (sa.CheckConstraint("frequency >= 3600 AND frequency % 3600 = 0", name="frequency_valid"),
                      sa.CheckConstraint("aggregation_window >= 3600 AND aggregation_window % 3600 = 0 AND "
                                         "aggregation_window >= frequency", name="aggregation_window_valid"),)

    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String(50))
    description = sa.Column(sa.String(200), default="")
    data_filters = sa.Column(PydanticType(pydantic_model=DataFilterList), nullable=True)
    lookback = sa.Column(sa.Integer)
    additional_kwargs = sa.Column(PydanticType(pydantic_model=MonitorCheckConfSchema), default=None, nullable=True)

    aggregation_window = sa.Column(sa.Integer, nullable=False)
    frequency = sa.Column(sa.Integer, nullable=False)

    latest_schedule = sa.Column(sa.DateTime(timezone=True), nullable=False, default=_get_start_schedule_time)

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
