# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""add balance classes

Revision ID: 320b2ed2c803
Revises: 53ef59cd095c
Create Date: 2023-02-15 12:50:41.273907

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '320b2ed2c803'
down_revision = '53ef59cd095c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('model_versions', sa.Column('balance_classes', sa.Boolean(), nullable=True))
    op.execute('UPDATE model_versions SET balance_classes = false;')
    op.alter_column('model_versions', 'balance_classes', nullable=False)

    op.add_column('checks', sa.Column('is_reference_required', sa.Boolean(), nullable=True))
    op.execute('UPDATE checks SET is_reference_required = false;')
    op.execute('UPDATE checks SET is_reference_required = true WHERE '
               'name like \'%Drift%\' or name like \'%Train-Test%\';')
    op.alter_column('checks', 'is_reference_required', nullable=False)


def downgrade() -> None:
    op.drop_column('checks', 'is_reference_required')
    op.drop_column('model_versions', 'balance_classes')
