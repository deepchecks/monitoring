# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""remove task table

Revision ID: 74de0ab443f4
Revises: 9b75d4bf2ee1
Create Date: 2023-05-11 10:29:29.333394

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import MetaData, Table
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '74de0ab443f4'
down_revision = '9b75d4bf2ee1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('INSERT INTO public.global_tasks (name, bg_worker_task, params, num_pushed) '
               'SELECT name, \'alerts\', params, 0 '
               'FROM tasks WHERE status=\'scheduled\' AND queue = \'monitors\' '
               'ON CONFLICT DO NOTHING')

    op.drop_table('tasks')


def downgrade() -> None:
    op.create_table('tasks',
                    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
                    sa.Column('name', sa.VARCHAR(), autoincrement=False, nullable=True),
                    sa.Column('executor', sa.VARCHAR(), autoincrement=False, nullable=False),
                    sa.Column('queue', sa.VARCHAR(), autoincrement=False, nullable=False),
                    sa.Column('status',
                              postgresql.ENUM('scheduled', 'running', 'completed', 'failed', 'expired', 'canceled',
                                              name='taskstatus'), server_default=sa.text("'scheduled'::taskstatus"),
                              autoincrement=False, nullable=False),
                    sa.Column('params', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"),
                              autoincrement=False, nullable=False),
                    sa.Column('priority', sa.INTEGER(), server_default=sa.text('0'), autoincrement=False,
                              nullable=False),
                    sa.Column('description', sa.VARCHAR(), autoincrement=False, nullable=True),
                    sa.Column('error', sa.VARCHAR(), autoincrement=False, nullable=True),
                    sa.Column('traceback', sa.VARCHAR(), autoincrement=False, nullable=True),
                    sa.Column('reference', sa.VARCHAR(), autoincrement=False, nullable=True),
                    sa.Column('execute_after', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'),
                              autoincrement=False, nullable=False),
                    sa.Column('enqueued_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'),
                              autoincrement=False, nullable=False),
                    sa.Column('started_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
                    sa.Column('finished_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
                    sa.PrimaryKeyConstraint('id', name='tasks_pkey'),
                    sa.UniqueConstraint('name', 'queue', name='name_uniqueness')
                    )
    op.create_index('ix_tasks_status', 'tasks', ['status'], unique=False)
    op.create_index('ix_tasks_reference', 'tasks', ['reference'], unique=False)
    op.create_index('ix_tasks_queue', 'tasks', ['queue'], unique=False)
    op.create_index('ix_tasks_executor', 'tasks', ['executor'], unique=False)
