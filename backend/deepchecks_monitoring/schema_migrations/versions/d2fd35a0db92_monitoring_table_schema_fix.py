# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""monitoring table schema fix

Revision ID: d2fd35a0db92
Revises: d18e5a487cfe
Create Date: 2022-11-09 14:51:59.650848
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'd2fd35a0db92'
down_revision = 'd18e5a487cfe'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        update model_versions
        set monitor_json_schema = jsonb_set(
            monitor_json_schema,
            '{properties, _dc_time, format}',
            '"date-time"'::jsonb,
            false
        )
        where monitor_json_schema -> 'properties' -> '_dc_time' ->> 'format' = 'datetime'
    """)


def downgrade() -> None:
    pass
