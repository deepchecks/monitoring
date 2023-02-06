# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""alert_name_to_id

Revision ID: a1d70019e14d
Revises: 9f485bd47729
Create Date: 2023-01-25 18:51:45.312705

"""
import json

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'a1d70019e14d'
down_revision = '9f485bd47729'
branch_labels = None
depends_on = None


def switch_func(to_name: bool):
    select = (
        "SELECT id, failed_values, alert_rule_id "
        "FROM alerts "
        "WHERE failed_values is not null and failed_values <> 'null'::jsonb"
    )

    rows = op.get_bind().execute(text(select)).fetchall()

    for row in rows:
        select_relevent_versions = f"""
            SELECT
                model_versions.id,
                model_versions.name
            FROM model_versions
                join checks on checks.model_id = model_versions.model_id
                join monitors on monitors.check_id = checks.id
                join alert_rules on alert_rules.monitor_id = monitors.id
            where alert_rules.id = {row['alert_rule_id']}
        """

        failed_values = row['failed_values']
        versions_list = op.get_bind().execute(text(select_relevent_versions)).fetchall()
        if to_name:
            versions_dict = {str(version['id']): version['name'] for version in versions_list}
        else:
            versions_dict = {version['name']: version['id'] for version in versions_list}
        for version, val in list(failed_values.items()):
            if versions_dict.get(version):
                del failed_values[version]
                failed_values[versions_dict[version]] = val

        q = text("UPDATE alerts SET failed_values = :failed_values WHERE id = :id")
        op.get_bind().execute(q.bindparams(id=row['id'], failed_values=json.dumps(failed_values)))


def upgrade() -> None:
    switch_func(False)


def downgrade() -> None:
    switch_func(True)
