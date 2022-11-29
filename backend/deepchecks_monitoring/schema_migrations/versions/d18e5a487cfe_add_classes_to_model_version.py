# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""add classes to model version

Revision ID: d18e5a487cfe
Revises: 14daeddd99d6
Create Date: 2022-11-03 11:16:49.852827

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'd18e5a487cfe'
down_revision = '14daeddd99d6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('model_versions', sa.Column('classes', sa.ARRAY(sa.String()), nullable=True))


def downgrade() -> None:
    op.drop_column('model_versions', 'classes')
