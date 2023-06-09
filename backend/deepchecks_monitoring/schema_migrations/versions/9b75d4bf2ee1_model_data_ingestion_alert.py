# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""model_data_ingestion_alert

Revision ID: 9b75d4bf2ee1
Revises: e8a5d4213c45
Create Date: 2023-04-27 15:15:11.444356

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '9b75d4bf2ee1'
down_revision = 'e8a5d4213c45'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('data_ingestion_alerts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('label_ratio', sa.Float(), nullable=True),
    sa.Column('label_count', sa.Integer(), nullable=True),
    sa.Column('sample_count', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
    sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
    sa.Column('resolved', sa.Boolean(), nullable=False),
    sa.Column('model_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['model_id'], ['models.id'], onupdate='RESTRICT', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.add_column('models', sa.Column('data_ingestion_alert_frequency', sa.Enum('HOUR', 'DAY', 'WEEK', 'MONTH', name='frequency'), nullable=True))
    op.add_column('models', sa.Column('data_ingestion_alert_latest_schedule', sa.DateTime(timezone=True), nullable=True))
    op.execute(sa.text('update models set data_ingestion_alert_frequency = \'DAY\''))
    op.execute(sa.text('update models set data_ingestion_alert_latest_schedule = date_trunc(\'day\', timezone("timezone", now()))'))
    op.alter_column('models', 'data_ingestion_alert_frequency', nullable=False)
    op.alter_column('models', 'data_ingestion_alert_latest_schedule', nullable=False)

    op.add_column('models', sa.Column('data_ingestion_alert_label_ratio', sa.Float(), nullable=True))
    op.add_column('models', sa.Column('data_ingestion_alert_label_count', sa.Integer(), nullable=True))
    op.add_column('models', sa.Column('data_ingestion_alert_sample_count', sa.Integer(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('models', 'data_ingestion_alert_sample_count')
    op.drop_column('models', 'data_ingestion_alert_label_count')
    op.drop_column('models', 'data_ingestion_alert_label_ratio')
    op.drop_column('models', 'data_ingestion_alert_latest_schedule')
    op.drop_column('models', 'data_ingestion_alert_frequency')
    op.drop_table('data_ingestion_alerts')
    # ### end Alembic commands ###
