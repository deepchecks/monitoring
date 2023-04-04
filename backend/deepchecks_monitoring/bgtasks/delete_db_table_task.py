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

    def queue_name(self) -> str:
        return QUEUE_NAME

    def delay_seconds(self) -> int:
        return 0

    async def run(self, task: 'Task', session: AsyncSession, resources_provider):
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
