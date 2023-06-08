# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#
import typing as t

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from deepchecks_monitoring.monitoring_utils import make_oparator_func
from deepchecks_monitoring.public_models.organization import Organization
from deepchecks_monitoring.public_models.task import BackgroundWorker, Task
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Model
from deepchecks_monitoring.schema_models.column_type import SAMPLE_ID_COL, SAMPLE_LABEL_COL, SAMPLE_TS_COL
from deepchecks_monitoring.schema_models.data_ingestion_alert import DataIngestionAlert
from deepchecks_monitoring.schema_models.data_ingestion_alert_rule import AlertRuleType, DataIngestionAlertRule
from deepchecks_monitoring.schema_models.monitor import Frequency, as_pendulum_datetime
from deepchecks_monitoring.utils import database
from deepchecks_monitoring.utils.alerts import Condition

__all__ = ["ModelDataIngestionAlerter"]


QUEUE_NAME = "model data ingestion alerter"
DELAY = 60


class ModelDataIngestionAlerter(BackgroundWorker):
    """Worker that alerts about data ingestion stats in relation to a model."""

    @classmethod
    def queue_name(cls) -> str:
        return QUEUE_NAME

    @classmethod
    def delay_seconds(cls) -> int:
        return DELAY

    async def run(self, task: "Task",
                  session: AsyncSession,  # pylint: disable=unused-argument
                  resources_provider: ResourcesProvider,
                  lock):
        alert_rule_id = task.params["alert_rule_id"]
        org_id = task.params["organization_id"]
        end_time = task.params["end_time"]
        start_time = task.params["start_time"]

        organization_schema = (await session.execute(
            sa.select(Organization.schema_name).where(
                Organization.id == org_id)
        )).scalar_one_or_none()

        # If organization was removed - doing nothing
        if organization_schema is None:
            await session.execute(sa.delete(Task).where(Task.id == task.id))
            await session.commit()
            return

        await database.attach_schema_switcher_listener(
            session=session,
            schema_search_path=[organization_schema, "public"]
        )

        alert_rule: DataIngestionAlertRule = (
            await session.execute(sa.select(DataIngestionAlertRule)
                                  .where(DataIngestionAlertRule.id == alert_rule_id))).scalars().first()

        # in case it was deleted
        if alert_rule is None:
            await session.execute(sa.delete(Task).where(Task.id == task.id))
            await session.commit()
            return

        model: Model = (await session.execute(sa.select(Model)
                                              .where(Model.id == alert_rule.model_id)
                                              .options(joinedload(Model.versions)))).scalars().first()
        freq: Frequency = alert_rule.frequency
        pdl_start_time = as_pendulum_datetime(start_time)
        pdl_end_time = as_pendulum_datetime(end_time)

        def truncate_date(col, agg_time_unit: str = "day"):
            return sa.func.cast(sa.func.extract("epoch", sa.func.date_trunc(agg_time_unit, col)), sa.Integer)

        def sample_id(columns):
            return getattr(columns, SAMPLE_ID_COL)

        def sample_timestamp(columns):
            return getattr(columns, SAMPLE_TS_COL)

        def sample_label(columns):
            return getattr(columns, SAMPLE_LABEL_COL)

        tables = [version.get_monitor_table(
            session) for version in model.versions]
        if not tables:
            return

        labels_table = model.get_sample_labels_table(session)
        # Get all samples within time window from all the versions
        data_query = sa.union_all(*(
            sa.select(
                sample_id(table.c).label("sample_id"),
                truncate_date(sample_timestamp(table.c),
                              freq.value.lower()).label("timestamp")
            ).where(
                sample_timestamp(table.c) <= pdl_end_time,
                sample_timestamp(table.c) > pdl_start_time
            ).distinct()
            for table in tables)
        )
        joined_query = sa.select(sa.literal(model.id).label("model_id"),
                                 data_query.c.sample_id,
                                 data_query.c.timestamp,
                                 sa.func.cast(sample_label(labels_table.c), sa.String).label("label")) \
            .join(labels_table, onclause=data_query.c.sample_id == sample_id(labels_table.c), isouter=True)

        rows = (await session.execute(
            sa.select(
                joined_query.c.model_id,
                joined_query.c.timestamp,
                sa.func.count(joined_query.c.sample_id).label("count"),
                sa.func.count(sa.func.cast(joined_query.c.label, sa.String)).label("label_count"))
            .group_by(joined_query.c.model_id, joined_query.c.timestamp)
            .order_by(joined_query.c.model_id, joined_query.c.timestamp, "count"),
        )).fetchall()

        pendulum_freq = freq.to_pendulum_duration()
        alerts = []
        for row in rows:
            match alert_rule.alert_type:
                case AlertRuleType.SAMPLE_COUNT:
                    value = row.count
                case AlertRuleType.LABEL_COUNT:
                    value = row.label_count
                case AlertRuleType.LABEL_RATIO:
                    value = row.count and row.label_count / row.count

            alert_condition = t.cast(Condition, alert_rule.condition)
            operator = make_oparator_func(alert_rule.condition.operator)

            if operator(value, alert_condition.value):
                start_time = as_pendulum_datetime(row.timestamp)
                end_time = start_time + pendulum_freq
                alert = DataIngestionAlert(alert_rule_id=alert_rule.id, start_time=start_time, end_time=end_time,
                                           value=value)
                alerts.append(alert)
                session.add(alert)

        await session.execute(sa.delete(Task).where(Task.id == task.id))
        await session.commit()
