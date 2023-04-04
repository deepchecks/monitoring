# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Renamed alerts name mid to medium

Revision ID: bfca690f5a74
Revises: dcab2cc8515b
Create Date: 2023-03-13 11:24:44.967985

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'bfca690f5a74'
down_revision = '9981564b113b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('''ALTER TYPE alertseverity RENAME VALUE 'MID' TO 'MEDIUM' ''')


def downgrade() -> None:
    op.execute('''ALTER TYPE alertseverity RENAME VALUE 'MEDIUM' TO 'MID' ''')
