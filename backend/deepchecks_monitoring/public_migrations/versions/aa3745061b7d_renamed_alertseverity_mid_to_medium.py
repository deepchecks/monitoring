# ----------------------------------------------------------------------------
# Copyright (C) 2021-2023 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Renamed alertseverity mid to medium

Revision ID: aa3745061b7d
Revises: 0ef236ebd237
Create Date: 2023-03-19 14:22:06.813916

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'aa3745061b7d'
down_revision = '0ef236ebd237'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('''ALTER TYPE alertseverity RENAME VALUE 'MID' TO 'MEDIUM' ''')


def downgrade() -> None:
    op.execute('''ALTER TYPE alertseverity RENAME VALUE 'MEDIUM' TO 'MID' ''')
