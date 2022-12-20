# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""add start/end times to model

Revision ID: 48ecb1727677
Revises: 2aff25ef5915
Create Date: 2022-12-15 16:32:24.402254

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '48ecb1727677'
down_revision = '0e37ca889b28'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('models', sa.Column('start_time', sa.DateTime(timezone=True), nullable=True))
    op.add_column('models', sa.Column('end_time', sa.DateTime(timezone=True), nullable=True))
    op.execute(text("""
        WITH versions as (
          SELECT model_id, max(end_time) as max_time, min(start_time) as min_time
          FROM model_versions
          GROUP BY model_versions.model_id
        )
        UPDATE models
        SET start_time = min_time, end_time = max_time
        FROM versions
        WHERE versions.model_id = models.id
    """))
    op.alter_column('models', 'start_time', nullable=False)
    op.alter_column('models', 'end_time', nullable=False)

    op.drop_constraint('only_positive_frequency', 'monitors')
    op.create_check_constraint('frequency_valid', 'monitors', 'frequency >= 3600 AND frequency % 3600 = 0')
    op.create_check_constraint('aggregation_window_valid', 'monitors',
                               'aggregation_window >= 3600 AND aggregation_window % 3600 = 0 AND '
                               'aggregation_window >= frequency')


def downgrade() -> None:
    op.drop_column('models', 'start_time')
    op.drop_column('models', 'end_time')

    op.drop_constraint('frequency_valid', 'monitors')
    op.drop_constraint('aggregation_window_valid', 'monitors')
    op.create_check_constraint('only_positive_frequency', 'monitors', 'frequency > 0')
