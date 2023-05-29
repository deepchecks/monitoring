# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the alert rule ORM model."""
import enum
import typing as t

import pendulum as pdl
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, column_property, relationship

from deepchecks_monitoring.schema_models.data_ingestion_alert import DataIngestionAlert
from deepchecks_monitoring.monitoring_utils import MetadataMixin
from deepchecks_monitoring.schema_models.base import Base
from deepchecks_monitoring.schema_models.permission_mixin import PermissionMixin
from deepchecks_monitoring.schema_models.pydantic_type import PydanticType
from deepchecks_monitoring.utils.alerts import AlertSeverity, Condition, Frequency

if t.TYPE_CHECKING:
    # pylint: disable=unused-import
    from deepchecks_monitoring.schema_models.model import Model

__all__ = ["DataIngestionAlertRule", "AlertRuleType"]


def _current_date_by_timezone(context):
    timezone = context.get_current_parameters().get("timezone", "UTC")
    return pdl.now(timezone).set(hour=0, minute=0, second=0, microsecond=0)


class AlertRuleType(str, enum.Enum):
    SAMPLE_COUNT = 'sample_count'
    LABEL_COUNT = 'label_count'
    LABEL_RATIO = 'label_ratio'


class DataIngestionAlertRule(Base, MetadataMixin, PermissionMixin):
    """ORM model for the data ingestion alert rule."""

    __tablename__ = "data_ingestion_alert_rules"

    id = sa.Column(sa.Integer, primary_key=True)
    condition = sa.Column(PydanticType(pydantic_model=Condition))
    alert_severity = sa.Column(sa.Enum(AlertSeverity), default=AlertSeverity.MEDIUM, nullable=False, index=True)
    is_active = sa.Column(sa.Boolean, default=True, nullable=False)
    frequency = sa.Column(sa.Enum(Frequency), nullable=False)
    alert_type = sa.Column(sa.Enum(AlertRuleType), nullable=False)
    alert_value = sa.Column(sa.Float, nullable=False)
    latest_schedule = sa.Column(sa.DateTime(timezone=True), nullable=False,
                                                     default=_current_date_by_timezone)

    model_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("models.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
    model: Mapped["Model"] = relationship(
        "Model",
        back_populates="alert_rules"
    )
    alerts: Mapped[t.List["DataIngestionAlert"]] = relationship(
        "DataIngestionAlert",
        back_populates="alert_rule",
        cascade="save-update, merge, delete",
        passive_deletes=True,
        passive_updates=True
    )

    @classmethod
    def get_object_by_id(cls, obj_id, user):
        # pylint: disable=redefined-outer-name,import-outside-toplevel
        from deepchecks_monitoring.schema_models.model import Model
        from deepchecks_monitoring.schema_models.model_memeber import ModelMember

        return (sa.select(cls)
                .join(DataIngestionAlertRule.model)
                .join(Model.members)
                .where(ModelMember.user_id == user.id)
                .where(cls.id == obj_id))

    @classmethod
    async def get_alerts_per_rule(
            cls,
            session: AsyncSession,
            ids: t.Optional[t.List[int]] = None
    ) -> t.Dict[int, int]:
        """Return count of active alerts per alert rule id.

        Parameters
        ----------
        ids: List[int], default None
            alert rules ids to filter by the results
        """
        q = UnresolvedAlertsCount

        if ids is not None:
            q = q.where(DataIngestionAlert.alert_rule_id.in_(ids))

        results = (await session.execute(q)).all()
        return {r.alert_rule_id: r.alerts_count for r in results}

    def stringify(self):
        """Return a string representing current alert rule instance."""
        return f"{self.alert_severity.capitalize()} - {self.condition}"


DataIngestionAlertRule.alert_severity_index = column_property(sa.case(
    *(
        (DataIngestionAlertRule.alert_severity == it.value, it.severity_index)
        for it in AlertSeverity
    ),
    else_=-1
))


UnresolvedAlertsCount = (
    sa.select(
        DataIngestionAlert.alert_rule_id.label("alert_rule_id"),
        sa.func.count(DataIngestionAlert.id).label("alerts_count")
    )
    .where(DataIngestionAlert.resolved.is_(False))
    .group_by(DataIngestionAlert.alert_rule_id)
)
