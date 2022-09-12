# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""updated filter way and added model task type

Revision ID: a04f0f00b5f0
Revises: b75212c5da00
Create Date: 2022-09-11 13:36:23.996790

"""
import sqlalchemy as sa
from alembic import op

import deepchecks_monitoring.models.pydantic_type
from backend.deepchecks_monitoring.models.model import TaskType
from deepchecks_monitoring.models.model import Model

# revision identifiers, used by Alembic.
revision = 'a04f0f00b5f0'
down_revision = 'b75212c5da00'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE tasktype RENAME VALUE 'CLASSIFICATION' TO 'MULTICLASS'")
        op.execute("ALTER TYPE tasktype ADD VALUE 'BINARY'")
    op.alter_column('alert_rules', 'name',
                    existing_type=sa.VARCHAR(length=50),
                    nullable=False)
    op.alter_column('alert_rules', 'monitor_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)
    op.create_unique_constraint(None, 'alert_rules', ['name', 'monitor_id'])
    op.add_column('monitors', sa.Column('additional_kwargs',
                  deepchecks_monitoring.models.pydantic_type.PydanticType(astext_type=sa.Text()), nullable=True))
    op.drop_column('monitors', 'filter_key')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE tasktype RENAME VALUE 'MULTICLASS' TO 'CLASSIFICATION'")
        op.execute(Model.update().where(Model.task_type == TaskType.BINARY).values(task_type='CLASSIFICATION'))
    op.execute("ALTER TYPE tasktype RENAME TO tasktype_old")
    op.execute("CREATE TYPE status AS "
                "ENUM('REGRESSION', 'CLASSIFICATION', 'VISION_DETECTION', 'VISION_CLASSIFICATION')")
    op.execute((
        "ALTER TABLE models ALTER COLUMN task_type TYPE tasktype USING "
        "tasktype::text::tasktype"
    ))
    op.execute("DROP TYPE tasktype_old")

    op.add_column('monitors', sa.Column('filter_key', sa.VARCHAR(length=50), autoincrement=False, nullable=True))
    op.drop_column('monitors', 'additional_kwargs')
    op.drop_constraint(None, 'alert_rules', type_='unique')
    op.alter_column('alert_rules', 'monitor_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)
    op.alter_column('alert_rules', 'name',
                    existing_type=sa.VARCHAR(length=50),
                    nullable=True)
    # ### end Alembic commands ###
