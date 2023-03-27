# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Added MetadataMixin

Revision ID: 294d2b30b20b
Revises: cc61786f5880
Create Date: 2023-03-26 16:56:15.373413

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '294d2b30b20b'
down_revision = 'cc61786f5880'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('alert_rules',
                  sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('alert_rules', sa.Column('created_by', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('alert_rules',
                  sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('alert_rules', sa.Column('updated_by', sa.Integer(), nullable=False, server_default=sa.text('0')))

    op.add_column('alert_webhooks',
                  sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('alert_webhooks', sa.Column('created_by', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('alert_webhooks',
                  sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('alert_webhooks', sa.Column('updated_by', sa.Integer(), nullable=False, server_default=sa.text('0')))

    op.add_column('checks',
                  sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('checks', sa.Column('created_by', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('checks',
                  sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('checks', sa.Column('updated_by', sa.Integer(), nullable=False, server_default=sa.text('0')))

    op.add_column('model_notes', sa.Column('created_by', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('model_notes',
                  sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('model_notes', sa.Column('updated_by', sa.Integer(), nullable=False, server_default=sa.text('0')))
    # model_notes column created_at already exists, therfore it is 'missing' here

    op.add_column('model_versions',
                  sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('model_versions', sa.Column('created_by', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('model_versions',
                  sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('model_versions', sa.Column('updated_by', sa.Integer(), nullable=False, server_default=sa.text('0')))

    op.add_column('models',
                  sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('models', sa.Column('created_by', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('models',
                  sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('models', sa.Column('updated_by', sa.Integer(), nullable=False, server_default=sa.text('0')))

    op.add_column('monitors',
                  sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('monitors', sa.Column('created_by', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('monitors',
                  sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('monitors', sa.Column('updated_by', sa.Integer(), nullable=False, server_default=sa.text('0')))

    op.add_column('slack_installations',
                  sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('slack_installations', sa.Column('created_by', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('slack_installations',
                  sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('slack_installations', sa.Column('updated_by', sa.Integer(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    op.drop_column('slack_installations', 'updated_by')
    op.drop_column('slack_installations', 'updated_at')
    op.drop_column('slack_installations', 'created_by')
    op.drop_column('slack_installations', 'created_at')

    op.drop_column('monitors', 'updated_by')
    op.drop_column('monitors', 'updated_at')
    op.drop_column('monitors', 'created_by')
    op.drop_column('monitors', 'created_at')

    op.drop_column('models', 'updated_by')
    op.drop_column('models', 'updated_at')
    op.drop_column('models', 'created_by')
    op.drop_column('models', 'created_at')

    op.drop_column('model_versions', 'updated_by')
    op.drop_column('model_versions', 'updated_at')
    op.drop_column('model_versions', 'created_by')
    op.drop_column('model_versions', 'created_at')

    op.drop_column('model_notes', 'updated_by')
    op.drop_column('model_notes', 'updated_at')
    op.drop_column('model_notes', 'created_by')

    op.drop_column('checks', 'updated_by')
    op.drop_column('checks', 'updated_at')
    op.drop_column('checks', 'created_by')
    op.drop_column('checks', 'created_at')

    op.drop_column('alert_webhooks', 'updated_by')
    op.drop_column('alert_webhooks', 'updated_at')
    op.drop_column('alert_webhooks', 'created_by')
    op.drop_column('alert_webhooks', 'created_at')

    op.drop_column('alert_rules', 'updated_by')
    op.drop_column('alert_rules', 'updated_at')
    op.drop_column('alert_rules', 'created_by')
    op.drop_column('alert_rules', 'created_at')
