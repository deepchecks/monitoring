# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""old tasks removal trigger

Revision ID: 254559c8d23d
Revises: 8a9bc6d69ca3
Create Date: 2022-11-30 14:26:24.290157
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '254559c8d23d'
down_revision = '8a9bc6d69ca3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    from deepchecks_monitoring.bgtasks.core import PGOldTasksDeletionFunc, PGOldTasksDeletionTrigger
    PGOldTasksDeletionFunc.execute(bind=op.get_bind())
    PGOldTasksDeletionTrigger.execute(bind=op.get_bind())


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS old_tasks_deletion ON tasks;")
    op.execute("DROP FUNCTION IF EXISTS delete_old_tasks;")
