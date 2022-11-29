"""added tasks table

Revision ID: d8aad956e10c
Revises: cda57fb776ef
Create Date: 2022-09-13 14:57:46.015200

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from deepchecks_monitoring.bgtasks.core import PGTaskNotificationFunc, PGTaskNotificationTrigger

# revision identifiers, used by Alembic.
revision = 'd8aad956e10c'
down_revision = 'cda57fb776ef'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('tasks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=True),
    sa.Column('executor', sa.String(), nullable=False),
    sa.Column('queue', sa.String(), nullable=False),
    sa.Column('status', sa.Enum('scheduled', 'running', 'completed', 'failed', 'expired', 'canceled', name='taskstatus'), server_default=sa.text("'scheduled'"), nullable=False),
    sa.Column('params', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.Column('priority', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('description', sa.String(), nullable=True),
    sa.Column('error', sa.String(), nullable=True),
    sa.Column('traceback', sa.String(), nullable=True),
    sa.Column('reference', sa.String(), nullable=True),
    sa.Column('execute_after', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('enqueued_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name', 'queue', name='name_uniqueness')
    )
    op.create_index(op.f('ix_tasks_executor'), 'tasks', ['executor'], unique=False)
    op.create_index(op.f('ix_tasks_queue'), 'tasks', ['queue'], unique=False)
    op.create_index(op.f('ix_tasks_reference'), 'tasks', ['reference'], unique=False)
    op.create_index(op.f('ix_tasks_status'), 'tasks', ['status'], unique=False)
    op.drop_constraint('invitations_organization_id_fkey', 'invitations', type_='foreignkey')
    op.create_foreign_key(None, 'invitations', 'organizations', ['organization_id'], ['id'], source_schema='public', referent_schema='public')
    op.drop_constraint('users_organization_id_fkey', 'users', type_='foreignkey')
    op.create_foreign_key(None, 'users', 'organizations', ['organization_id'], ['id'], source_schema='public', referent_schema='public')
    PGTaskNotificationFunc.execute(bind=op.get_bind())
    PGTaskNotificationTrigger.execute(bind=op.get_bind())
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.execute("DROP TRIGGER IF EXISTS trigger_new_task_notification ON tasks;")
    op.execute("DROP FUNCTION IF EXISTS new_task_notification;")
    op.drop_constraint(None, 'users', schema='public', type_='foreignkey')
    op.create_foreign_key('users_organization_id_fkey', 'users', 'organizations', ['organization_id'], ['id'])
    op.drop_constraint(None, 'invitations', schema='public', type_='foreignkey')
    op.create_foreign_key('invitations_organization_id_fkey', 'invitations', 'organizations', ['organization_id'], ['id'])
    op.drop_index(op.f('ix_tasks_status'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_reference'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_queue'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_executor'), table_name='tasks')
    op.drop_table('tasks')
    # ### end Alembic commands ###
