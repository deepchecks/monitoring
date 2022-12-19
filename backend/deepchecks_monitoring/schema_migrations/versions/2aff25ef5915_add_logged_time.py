# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""add logged time

Revision ID: 2aff25ef5915
Revises: 4ba6a640c364
Create Date: 2022-12-11 10:37:00.305953

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = '2aff25ef5915'
down_revision = '4ba6a640c364'
branch_labels = None
depends_on = None


def upgrade() -> None:
    from deepchecks import BaseCheck
    from deepchecks.core.reduce_classes import ReduceLabelMixin

    # Add logged timestamp to all monitor tables
    model_versions = op.get_bind().execute(text('SELECT * FROM model_versions')).fetchall()
    for version in model_versions:
        table = f'model_{version["model_id"]}_monitor_data_{version["id"]}'
        op.add_column(table, sa.Column('_dc_logged_time', sa.DateTime(timezone=True)))

    op.add_column('model_versions', sa.Column('private_columns', JSONB(), nullable=True))
    op.execute(text('UPDATE model_versions SET private_columns = \'{"_dc_logged_time": "datetime"}\'::jsonb'))
    op.alter_column('model_versions', 'private_columns', nullable=False)

    # Add is_label_required to all checks
    op.add_column('checks', sa.Column('is_label_required', sa.Boolean(), nullable=True))
    checks = op.get_bind().execute(text('SELECT * FROM checks')).fetchall()
    for check in checks:
        dp_check = BaseCheck.from_config(check['config'])
        is_label_required = isinstance(dp_check, ReduceLabelMixin)
        op.execute(text(f'UPDATE checks SET is_label_required={is_label_required} WHERE id={check["id"]}'))
    op.alter_column('checks', 'is_label_required', nullable=False)

    # Add models alerts delay
    op.add_column('models', sa.Column('alerts_delay_labels_ratio', sa.Float(), nullable=True))
    op.add_column('models', sa.Column('alerts_delay_seconds', sa.Integer(), nullable=True))
    seconds = 60 * 60 * 24 * 3  # 3 days
    op.execute(text(f'UPDATE models SET alerts_delay_labels_ratio=1, alerts_delay_seconds={seconds}'))
    op.alter_column('models', 'alerts_delay_labels_ratio', nullable=False)
    op.alter_column('models', 'alerts_delay_seconds', nullable=False)
    op.create_check_constraint('labels_ratio_is_0_to_1', 'models', 'alerts_delay_labels_ratio >= 0 AND alerts_delay_labels_ratio <= 1')
    op.create_check_constraint('alerts_delay_seconds_is_positive', 'models', 'alerts_delay_seconds >= 0')


def downgrade() -> None:
    model_versions = op.get_bind().execute(text('SELECT * FROM model_versions')).fetchall()
    for version in model_versions:
        table = f"model_{version['model_id']}_monitor_data_{version['id']}"
        op.drop_column(table, '_dc_logged_time')

    op.drop_column('model_versions', 'private_columns')
    op.drop_column('checks', 'is_label_required')
    op.drop_column('models', 'alerts_delay_labels_ratio')
    op.drop_column('models', 'alerts_delay_seconds')
