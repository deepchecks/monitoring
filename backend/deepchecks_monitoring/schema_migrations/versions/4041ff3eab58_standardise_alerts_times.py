# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""standardise_alerts_times

Revision ID: 4041ff3eab58
Revises: c3a1c066eefc
Create Date: 2023-06-15 14:30:47.472485

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '4041ff3eab58'
down_revision = 'c3a1c066eefc'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE alerts SET end_time = date_trunc('second', end_time  + interval '1 millisecond')")


def downgrade() -> None:
    op.execute("UPDATE alerts SET end_time = end_time  - interval '1 millisecond'")
