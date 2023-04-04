# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""update alerts end time

Revision ID: 5595c044948b
Revises: a6ac6c689b56
Create Date: 2023-01-26 15:43:43.389922

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '5595c044948b'
down_revision = 'a6ac6c689b56'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text('UPDATE alerts SET end_time = end_time - interval \'1 microsecond\''))


def downgrade() -> None:
    op.execute(sa.text('UPDATE alerts SET end_time = end_time + interval \'1 microsecond\''))
