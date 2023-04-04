# ----------------------------------------------------------------------------
# Copyright (C) 2021-2023 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""l2_to_l3

Revision ID: 9981564b113b
Revises: dcab2cc8515b
Create Date: 2023-03-19 11:13:17.477935

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '9981564b113b'
down_revision = 'dcab2cc8515b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("""
    UPDATE monitors SET
  additional_kwargs = jsonb_set(additional_kwargs,'{check_conf, aggregation method}', '["l3_weighted"]')
where (additional_kwargs -> 'check_conf' -> 'aggregation method') ? 'l2_weighted'
 """))

    op.execute(sa.text("""
        UPDATE checks SET
      config = jsonb_set(config,'{params, aggregation_method}', '"l3_weighted"')
    where (config -> 'params' -> 'aggregation_method') ? 'l2_weighted'
     """))


def downgrade() -> None:
    op.execute(sa.text("""
        UPDATE monitors SET
      additional_kwargs = jsonb_set(additional_kwargs,'{check_conf, aggregation method}', '["l2_weighted"]')
    where (additional_kwargs -> 'check_conf' -> 'aggregation method') ? 'l3_weighted'
     """))

    op.execute(sa.text("""
            UPDATE checks SET
          config = jsonb_set(config,'{params, aggregation_method}', '"l2_weighted"')
        where (config -> 'params' -> 'aggregation_method') ? 'l3_weighted'
         """))
