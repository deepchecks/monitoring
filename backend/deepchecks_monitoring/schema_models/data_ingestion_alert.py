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
from typing import TYPE_CHECKING

import pendulum as pdl
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.schema_models.base import Base
from deepchecks_monitoring.schema_models.permission_mixin import PermissionMixin

if TYPE_CHECKING:
    from deepchecks_monitoring.schema_models.data_ingestion_alert_rule import DataIngestionAlertRule


__all__ = ["DataIngestionAlert"]


class DataIngestionAlert(Base, PermissionMixin):
    """ORM model for the alert."""

    __tablename__ = "data_ingestion_alerts"

    id = sa.Column(sa.Integer, primary_key=True)
    value = sa.Column(sa.Float)
    created_at = sa.Column(sa.DateTime(timezone=True), default=pdl.now)
    start_time = sa.Column(sa.DateTime(timezone=True), nullable=False, index=True)
    end_time = sa.Column(sa.DateTime(timezone=True), nullable=False, index=True)
    resolved = sa.Column(sa.Boolean, nullable=False, default=False, index=True)

    alert_rule_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("data_ingestion_alert_rules.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
    alert_rule: Mapped["DataIngestionAlertRule"] = relationship(
        "DataIngestionAlertRule",
        back_populates="alerts"
    )

    @classmethod
    async def has_object_permissions(cls, session, obj_id, user):
        # pylint: disable=redefined-outer-name,import-outside-toplevel
        from deepchecks_monitoring.schema_models.data_ingestion_alert_rule import DataIngestionAlertRule
        from deepchecks_monitoring.schema_models.model import Model
        from deepchecks_monitoring.schema_models.model_memeber import ModelMember

        return await session.scalar(sa.select(1)
                                    .join(cls.alert_rule)
                                    .join(DataIngestionAlertRule.model)
                                    .join(Model.members)
                                    .where(ModelMember.user_id == user.id)
                                    .where(cls.id == obj_id))
