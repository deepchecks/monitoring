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
import uuid

from sqlalchemy import delete, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.public_models.task import UNIQUE_NAME_TASK_CONSTRAINT, BackgroundWorker, Task

__all__ = ['DeleteDbTableTask', 'insert_delete_db_table_task']

QUEUE_NAME = 'delete table'


class DeleteDbTableTask(BackgroundWorker):
    """Worker to delete any database tables.

    """

    @classmethod
    def queue_name(cls) -> str:
        return QUEUE_NAME

    @classmethod
    def delay_seconds(cls) -> int:
        return 0

    async def run(self, task: 'Task', session: AsyncSession, resources_provider, lock):
        for table in task.params['full_table_paths']:
            await session.execute(text(f'DROP TABLE IF EXISTS {table}'))
        # Deleting the task
        await session.execute(delete(Task).where(Task.id == task.id))


async def insert_delete_db_table_task(session: AsyncSession, full_table_paths: t.List[str]):
    """Insert task to delete database table.

    """
    params = {'full_table_paths': full_table_paths}
    values = dict(name=f'Tables Deletion {str(uuid.uuid4())}', bg_worker_task=QUEUE_NAME,
                  params=params)

    await session.execute(insert(Task).values(values).on_conflict_do_nothing(constraint=UNIQUE_NAME_TASK_CONSTRAINT))
