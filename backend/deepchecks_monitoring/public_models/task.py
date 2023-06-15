# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Task entity model."""
import abc
import typing as t
from datetime import datetime

import sqlalchemy as sa
from redis.asyncio.lock import Lock
from sqlalchemy import Integer, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.public_models import Base

__all__ = ['Task', 'UNIQUE_NAME_TASK_CONSTRAINT', 'BackgroundWorker']


UNIQUE_NAME_TASK_CONSTRAINT = 'task_unique_constraint'


class BackgroundWorker(abc.ABC):
    """Base class for background workers."""

    @classmethod
    @abc.abstractmethod
    def queue_name(cls) -> str:
        """Queue name."""
        pass

    @classmethod
    @abc.abstractmethod
    def delay_seconds(cls) -> int:
        """The delay in seconds between the time task is queued to when it is executed."""
        pass

    @classmethod
    def retry_seconds(cls) -> int:
        """The retry in seconds between the task executions."""
        return 600

    @abc.abstractmethod
    async def run(self, task: 'Task', session: AsyncSession, resources_provider, lock: Lock):
        """Main logic of the worker."""
        pass


class Task(Base):
    """Task model."""

    __tablename__ = 'global_tasks'
    __table_args__ = (
        sa.UniqueConstraint('name', 'bg_worker_task', name=UNIQUE_NAME_TASK_CONSTRAINT),
    )

    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String(100), nullable=False)
    bg_worker_task = sa.Column(sa.String(30), nullable=False)
    creation_time = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=func.now())
    # Used to re-push tasks to the queue, in case worker drops the task (reboot, error, etc)
    num_pushed = sa.Column(sa.Integer, nullable=False, default=0)
    params = sa.Column(JSONB, nullable=True)


async def delete_monitor_tasks(
    monitor_ids: t.Union[int, t.List[int]],
    schedule: datetime,
    session: AsyncSession
):
    """Delete monitor tasks."""
    if not isinstance(monitor_ids, t.List):
        monitor_ids = [monitor_ids]
    await session.execute(
        sa.delete(Task).where(
            sa.cast(Task.params['timestamp'].astext, TIMESTAMP(True)) > schedule,
            sa.cast(Task.params['monitor_id'].astext, Integer).in_(monitor_ids),
        ),
        execution_options={'synchronize_session': False}
    )
