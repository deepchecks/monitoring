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
import enum
import typing as t
from datetime import datetime

import pendulum as pdl
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import INTERVAL
from sqlalchemy.engine.default import DefaultExecutionContext
from sqlalchemy.future import select
from sqlalchemy.orm import Mapped, column_property, relationship

from deepchecks_monitoring.monitoring_utils import DataFilterList, MetadataMixin, MonitorCheckConfSchema
from deepchecks_monitoring.schema_models.base import Base
from deepchecks_monitoring.schema_models.pydantic_type import PydanticType

if t.TYPE_CHECKING:
    # pylint: disable=unused-import
    from pendulum.datetime import DateTime as PendulumDateTime

    # pylint: disable=unused-import
    from deepchecks_monitoring.schema_models.alert_rule import AlertRule
    from deepchecks_monitoring.schema_models.check import Check
    from deepchecks_monitoring.schema_models.dashboard import Dashboard

__all__ = ["Monitor", "NUM_WINDOWS_TO_START"]

NUM_WINDOWS_TO_START = 14


def _calculate_default_latest_schedule(context: DefaultExecutionContext):
    # pylint: disable=import-outside-toplevel, redefined-outer-name
    from deepchecks_monitoring.schema_models.check import Check
    from deepchecks_monitoring.schema_models.model import Model

    check_id = t.cast(int, context.get_current_parameters()["check_id"])
    frequency = t.cast("Frequency", context.get_current_parameters()["frequency"])

    record = context.connection.execute(
        select(Model.start_time, Model.end_time, Model.timezone)
        .join(Check, Check.id == check_id)
        .where(Model.id == Check.model_id)
    ).first()

    tz = record["timezone"]
    start_time = pdl.instance(record["start_time"])
    end_time = pdl.instance(record["end_time"])

    return calculate_initial_latest_schedule(
        frequency=frequency,
        model_timezone=tz,
        model_start_time=start_time,
        model_end_time=end_time,
    )


class Frequency(str, enum.Enum):
    """Monitor execution frequency."""

    HOUR = "HOUR"
    DAY = "DAY"
    WEEK = "WEEK"
    MONTH = "MONTH"

    def to_pendulum_duration_unit(self):
        return f"{self.value.lower()}s"

    def to_pendulum_duration(self):
        unit = self.to_pendulum_duration_unit()
        return pdl.duration(**{unit: 1})

    def to_postgres_interval(self):
        return f"INTERVAL '1 {self.value}'"


class Monitor(Base, MetadataMixin):
    """ORM model for the monitor."""

    __tablename__ = "monitors"

    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String(50))
    description = sa.Column(sa.String(200), default="")
    data_filters = sa.Column(PydanticType(pydantic_model=DataFilterList), nullable=True)
    lookback = sa.Column(sa.Integer)
    additional_kwargs = sa.Column(PydanticType(pydantic_model=MonitorCheckConfSchema), default=None, nullable=True)

    aggregation_window = sa.Column(sa.Integer, nullable=False, default=1, server_default=sa.literal(1))
    frequency = sa.Column(sa.Enum(Frequency), nullable=False)
    latest_schedule = sa.Column(sa.DateTime(timezone=True), nullable=False, default=_calculate_default_latest_schedule)

    frequency_as_interval = column_property(sa.cast(
        sa.func.concat(1, " ", sa.cast(frequency, sa.VARCHAR)),
        INTERVAL
    ))

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

    @property
    def next_schedule(self):
        latest_schedule = pdl.instance(t.cast("datetime", self.latest_schedule))
        frequency = t.cast("Frequency", self.frequency).to_pendulum_duration()
        return latest_schedule + frequency

    # TODO: better/shorter name
    @property
    def left_edge_of_calculation_window(self) -> "PendulumDateTime":
        frequency = t.cast("Frequency", self.frequency).to_pendulum_duration()
        aggregation_window = frequency * t.cast(int, self.aggregation_window)
        return self.next_schedule - aggregation_window


def as_pendulum_datetime(value: t.Union[int, str, "PendulumDateTime", "datetime"]) -> "PendulumDateTime":
    if isinstance(value, datetime):
        return pdl.instance(value)
    elif isinstance(value, int):
        return pdl.from_timestamp(value)
    elif isinstance(value, str):
        return t.cast("PendulumDateTime", pdl.parser.parse(value))
    else:
        raise TypeError(f"Unexpected type of value - {type(value)}")


def round_off_datetime(
    value: t.Union[int, str, "PendulumDateTime", "datetime"],
    frequency: "Frequency"
) -> "PendulumDateTime":
    value = as_pendulum_datetime(value)
    start_of_window = value.start_of(frequency.value.lower())
    duration = frequency.to_pendulum_duration()
    return start_of_window + duration


def calculate_initial_latest_schedule(
    frequency: "Frequency",
    *,
    model_timezone: str = "UTC",
    model_start_time: t.Optional["pdl.datetime.DateTime"] = None,
    model_end_time: t.Optional["pdl.datetime.DateTime"] = None,
    windows_to_lookback: int = NUM_WINDOWS_TO_START
):
    now = pdl.now(model_timezone)
    lookback = frequency.to_pendulum_duration() * windows_to_lookback

    if model_end_time is not None and model_start_time is not None:
        unrounded_latest_schedule = (
            (now - lookback)
            if model_end_time < model_start_time
            else max(model_start_time, model_end_time - lookback)
        ).in_tz(model_timezone)
    else:
        unrounded_latest_schedule = (now - lookback).in_tz(model_timezone)

    return round_off_datetime(
        unrounded_latest_schedule,
        frequency=frequency
    )


def monitor_execution_range(
    latest_schedule: "pdl.datetime.DateTime",
    frequency: "Frequency",
    *,
    until: t.Optional["pdl.datetime.DateTime"] = None
):
    if until is not None and latest_schedule >= until:
        return

    duration = frequency.to_pendulum_duration()
    previous = latest_schedule + duration

    if until is not None:
        while True:
            if previous > until:
                return
            else:
                yield previous
                previous = previous + duration
    else:
        while True:
            yield previous
            previous = previous + duration
