# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""notify_mail_column

Revision ID: 99feb5aaeab6
Revises: 70ea0f70dca5
Create Date: 2024-03-21 16:08:16.575834

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '99feb5aaeab6'
down_revision = '70ea0f70dca5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('model_members', sa.Column('notify', sa.Boolean(), server_default=sa.text('true'), nullable=False))


def downgrade() -> None:
    op.drop_column('model_members', 'notify')
