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
# pylint: disable=unused-argument
import sqlalchemy as sa
from redis.asyncio.lock import Lock
from sqlalchemy.dialects.postgresql import insert as pginsert
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.public_models.organization import Organization
from deepchecks_monitoring.public_models.task import UNIQUE_NAME_TASK_CONSTRAINT, BackgroundWorker, Task
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.utils import database, mixpanel

__all__ = ["MixpanelSystemStateEvent"]


QUEUE_NAME = "mixpanel system state event"
DELAY = 0


class MixpanelSystemStateEvent(BackgroundWorker):
    """Worker that sends a system state event to the mixpanel."""

    @classmethod
    def queue_name(cls) -> str:
        """REturn queue name."""
        return QUEUE_NAME

    @classmethod
    def delay_seconds(cls) -> int:
        """Return delay in seconds."""
        return DELAY

    @classmethod
    def retry_seconds(cls) -> int:
        """The retry in seconds between the task executions."""
        return 3600

    async def run(
        self,
        task: "Task",
        session: AsyncSession,
        resources_provider: ResourcesProvider,
        lock: Lock
    ):
        """Run task."""
        if not resources_provider.is_analytics_enabled:
            return
        if not resources_provider.settings.is_on_prem or resources_provider.settings.is_cloud:
            return

        organizations = (await session.scalars(
            sa.select(Organization))
        ).all()

        for org in organizations:
            async with database.attach_schema_switcher(
                session=session,
                schema_search_path=[org.schema_name, "public"]
            ):
                await resources_provider.report_mixpanel_event(
                    mixpanel.HealthcheckEvent.create_event,
                    organization=org
                )

    @classmethod
    async def enqueue_task(cls, session: AsyncSession):
        """Enqueue task."""
        values = {
            "name": "system-state",
            "bg_worker_task": cls.queue_name(),
            "params": {}
        }
        await session.execute(
            pginsert(Task)
            .values(values)
            .on_conflict_do_nothing(constraint=UNIQUE_NAME_TASK_CONSTRAINT)
        )
