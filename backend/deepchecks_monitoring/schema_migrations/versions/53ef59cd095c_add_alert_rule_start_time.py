# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""add alert rule start time

Revision ID: 53ef59cd095c
Revises: 9f485bd47729
Create Date: 2023-02-05 17:49:50.280472

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '53ef59cd095c'
down_revision = 'a1d70019e14d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('alert_rules', sa.Column('start_time', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('alert_rules', 'start_time')
