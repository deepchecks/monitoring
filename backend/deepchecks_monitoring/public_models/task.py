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

import sqlalchemy as sa
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.public_models import Base

__all__ = ['Task', 'UNIQUE_NAME_TASK_CONSTRAINT', 'BackgroundWorker']


UNIQUE_NAME_TASK_CONSTRAINT = 'task_unique_constraint'


class BackgroundWorker(abc.ABC):
    """Base class for background workers."""

    @abc.abstractmethod
    def queue_name(self) -> str:
        """Queue name."""
        pass

    @abc.abstractmethod
    def delay_seconds(self) -> int:
        """The delay in seconds between the time task is queued to when it is executed."""
        pass

    @abc.abstractmethod
    async def run(self, task: 'Task', session: AsyncSession, resources_provider):
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
