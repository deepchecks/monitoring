# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""ingestion_errors_model_id

Revision ID: 70ea0f70dca5
Revises: c3a1c066eefc
Create Date: 2023-06-14 20:24:51.622956

"""
import logging

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '70ea0f70dca5'
down_revision = 'c3a1c066eefc'
branch_labels = None
depends_on = None

log = logging.getLogger("app")

def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('ingestion_errors', sa.Column('model_id', sa.Integer(), nullable=True))
    op.alter_column('ingestion_errors', 'created_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               nullable=True,
               existing_server_default=sa.text('now()'))
    op.alter_column('ingestion_errors', 'model_version_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.drop_index('ix_ingestion_errors_created_at', table_name='ingestion_errors')
    op.create_index(op.f('ix_ingestion_errors_model_id'), 'ingestion_errors', ['model_id'], unique=False)
    op.create_index(op.f('ix_ingestion_errors_model_version_id'), 'ingestion_errors', ['model_version_id'], unique=False)
    op.create_foreign_key(None, 'ingestion_errors', 'models', ['model_id'], ['id'], onupdate='RESTRICT', ondelete='CASCADE')

    log.info("before running update statement to update the new model_id column in ingestion_errors table")
    op.execute(sa.text("""
        UPDATE ingestion_errors AS i
        SET model_id = m.model_id
        FROM model_versions AS m
        WHERE m.id = i.model_version_id 
    """))
    log.info("after running update statement to update the new model_id column in ingestion_errors table")


    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_ingestion_errors_model_version_id'), table_name='ingestion_errors')
    op.drop_index(op.f('ix_ingestion_errors_model_id'), table_name='ingestion_errors')
    op.create_index('ix_ingestion_errors_created_at', 'ingestion_errors', ['created_at'], unique=False)
    op.alter_column('ingestion_errors', 'model_version_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.alter_column('ingestion_errors', 'created_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               nullable=False,
               existing_server_default=sa.text('now()'))
    op.drop_column('ingestion_errors', 'model_id')
    # ### end Alembic commands ###
