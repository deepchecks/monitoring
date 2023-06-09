"""add global tasks

Revision ID: 1dbc6ac5ef4c
Revises: 28d04e840199
Create Date: 2023-01-19 11:53:18.243410

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '1dbc6ac5ef4c'
down_revision = '28d04e840199'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        'global_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('bg_worker_task', sa.String(length=30), nullable=False),
        sa.Column('creation_time', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('num_pushed', sa.Integer(), default=0),
        sa.Column('params', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', 'bg_worker_task', name='task_unique_constraint'),
        schema='public'
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('global_tasks', schema='public')
    # ### end Alembic commands ###
