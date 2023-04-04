# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""update monitor filters

Revision ID: a6ac6c689b56
Revises: d568613130f0
Create Date: 2023-01-10 10:45:41.715804

"""
import json

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a6ac6c689b56'
down_revision = 'd568613130f0'
branch_labels = None
depends_on = None


def switch_func(old, new):
    select = "SELECT id, data_filters FROM monitors WHERE data_filters is not null and data_filters <> 'null'::jsonb"
    rows = op.get_bind().execute(text(select)).fetchall()
    for row in rows:
        data_filters = row['data_filters']
        update = False
        for single_filter in data_filters['filters']:
            if single_filter['operator'] == old:
                update = True
                single_filter['operator'] = new
        if update:
            q = text("UPDATE monitors SET data_filters = :data_filters WHERE id = :id")
            op.get_bind().execute(q.bindparams(id=row['id'], data_filters=json.dumps(data_filters)))


def upgrade() -> None:
    switch_func('contains', 'in')


def downgrade() -> None:
    switch_func('in', 'contains')
