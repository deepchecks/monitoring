# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""remove schedule_start column

Revision ID: d568613130f0
Revises: a8341cc95913
Create Date: 2022-12-26 16:12:11.883982

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'd568613130f0'
down_revision = 'a8341cc95913'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(text('update monitors set latest_schedule = scheduling_start where latest_schedule is null'))
    op.drop_column('monitors', 'scheduling_start')


def downgrade() -> None:
    op.add_column('monitors', sa.Column('scheduling_start', sa.DateTime(timezone=True), nullable=True))
    op.execute(text('update monitors set scheduling_start = latest_schedule'))
    op.alter_column('monitors', 'scheduling_start', nullable=False)
