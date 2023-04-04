# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""labels refactor

Revision ID: cc61786f5880
Revises: dcab2cc8515b
Create Date: 2023-03-12 14:35:34.779027

"""
import json

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'cc61786f5880'
down_revision = 'bfca690f5a74'
branch_labels = None
depends_on = None


def get_label_sql_column_type(task_type):
    if task_type == 'REGRESSION':
        return sa.Float
    elif task_type in ['BINARY', 'MULTICLASS']:
        return sa.Text
    else:
        raise Exception(f"Not supported task type {task_type}")


def get_json_schema_label_type(task_type):
    if task_type == 'REGRESSION':
        return 'number'
    elif task_type in ['BINARY', 'MULTICLASS']:
        return 'string'
    else:
        raise Exception(f"Not supported task type {task_type}")


def get_general_label_type(task_type):
    if task_type == 'REGRESSION':
        return 'numeric'
    elif task_type in ['BINARY', 'MULTICLASS']:
        return 'categorical'
    else:
        raise Exception(f"Not supported task type {task_type}")


def upgrade() -> None:
    # Add columns to models
    op.add_column('models', sa.Column('last_update_time', sa.DateTime(timezone=True), nullable=False,
                                      server_default=sa.func.now()))
    op.add_column('models', sa.Column('ingestion_offset', sa.BigInteger, default=-1))
    op.add_column('models', sa.Column('topic_end_offset', sa.BigInteger, default=-1))

    models = op.get_bind().execute(sa.text('select * from models')).fetchall()
    for model in models:
        # Labels table
        labels_table = f"model_{model['id']}_sample_labels"
        op.create_table(labels_table,
                        sa.Column('_dc_sample_id', sa.Text, primary_key=True),
                        sa.Column('_dc_label', get_label_sql_column_type(model['task_type'])))

        # Sample ids table
        version_map_table = f"model_{model['id']}_samples_versions_map"
        op.create_table(version_map_table,
                        sa.Column('_dc_sample_id', sa.Text),
                        sa.Column('version_id', sa.Integer))
        op.create_primary_key(constraint_name=None, table_name=version_map_table,
                              columns=['_dc_sample_id', 'version_id'])

        versions = op.get_bind().execute(sa.text(f'select id from model_versions where model_id = {model["id"]}')).fetchall()
        for version in versions:
            data_table = f"model_{model['id']}_monitor_data_{version['id']}"
            op.execute(sa.text(
                f'INSERT INTO {version_map_table} SELECT _dc_sample_id, \'{version["id"]}\' FROM {data_table}'
            ))
            op.execute(sa.text(
                f'INSERT INTO {labels_table} SELECT _dc_sample_id, _dc_label FROM {data_table} ON CONFLICT DO NOTHING'
            ))
            op.drop_column(data_table, '_dc_label')

        # Add label column to reference private fields
        label_type = get_general_label_type(model['task_type'])
        op.execute(f'UPDATE model_versions SET private_reference_columns[\'_dc_label\'] = \'"{label_type}"\'::jsonb')

    # Remove from all the versions the label column in the schema
    op.execute('UPDATE model_versions SET model_columns = model_columns - \'_dc_label\'')
    op.execute('UPDATE model_versions SET monitor_json_schema = monitor_json_schema #- \'{properties,_dc_label}\'')


def downgrade() -> None:
    op.drop_column('models', 'last_update_time')
    op.drop_column('models', 'ingestion_offset')
    op.drop_column('models', 'topic_end_offset')

    models = op.get_bind().execute(sa.text('select * from models')).fetchall()
    for model in models:
        # Labels table
        labels_table = f"model_{model['id']}_sample_labels"
        # Sample ids table
        version_map_table = f"model_{model['id']}_samples_versions_map"

        versions = op.get_bind().execute(sa.text(f'select id from model_versions where model_id = {model["id"]}')).fetchall()
        for version in versions:
            data_table = f"model_{model['id']}_monitor_data_{version['id']}"
            # Add label column
            op.add_column(data_table, sa.Column('_dc_label', get_label_sql_column_type(model['task_type'])))
            op.execute(sa.text(f'UPDATE {data_table} SET _dc_label = {labels_table}._dc_label FROM {labels_table} '
                               f'WHERE {data_table}._dc_sample_id = {labels_table}._dc_sample_id'))

        op.drop_table(labels_table)
        op.drop_table(version_map_table)

        # Add label column to all the versions schemas
        json_schema_label_type = {
            'type': [get_json_schema_label_type(model['task_type']), 'null']
        }
        json_schema_label_type = json.dumps(json_schema_label_type)
        label_type = get_general_label_type(model['task_type'])
        op.execute(f'UPDATE model_versions SET model_columns[\'_dc_label\'] = \'"{label_type}"\'::jsonb '
                   f'WHERE model_id = {model["id"]}')
        op.execute(f'UPDATE model_versions SET monitor_json_schema[\'properties\'][\'_dc_label\'] = '
                   f'\'{json_schema_label_type}\'::jsonb '
                   f'WHERE model_id = {model["id"]}')

    # Remove label from reference private fields
    op.execute(f'UPDATE model_versions SET private_reference_columns = private_reference_columns - \'_dc_label\'')
