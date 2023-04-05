# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""tables fix

Revision ID: e8a5d4213c45
Revises: ba2e7acc66c2
Create Date: 2023-04-04 10:28:41.107291

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e8a5d4213c45'
down_revision = 'ba2e7acc66c2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
     update model_versions as mv
     set private_reference_columns = jsonb_set(
            private_reference_columns,
            '{_dc_label}',
            case
                when m.task_type = 'BINARY' then '"categorical"'::jsonb
                when m.task_type = 'MULTICLASS' then '"categorical"'::jsonb
                when m.task_type = 'REGRESSION' then '"numeric"'::jsonb
                else private_reference_columns -> '_dc_label'
            end
        )
     from models as m
     where m.id = mv.model_id
    """)

    versions = op.get_bind().execute(sa.text(f'select id, model_id from model_versions')).fetchall()
    for version in versions:
        data_table = f"model_{version['model_id']}_monitor_data_{version['id']}"
        op.execute(f"ALTER TABLE {data_table} ADD COLUMN IF NOT EXISTS _dc_logged_time TIMESTAMPTZ default now()")
        op.execute(f"UPDATE {data_table} SET _dc_logged_time = now() WHERE _dc_logged_time IS NULL")


def downgrade() -> None:
    pass
