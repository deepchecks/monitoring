# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""fix WebhookKind enum

Revision ID: 021d60e962f4
Revises: 74de0ab443f4
Create Date: 2023-05-16 16:51:46.468918

"""
import textwrap

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '021d60e962f4'
down_revision = '74de0ab443f4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE alert_webhooks DROP CONSTRAINT IF EXISTS additional_arguments_value_correctness;")
    op.execute("ALTER TYPE webhookkind RENAME VALUE 'STANDART' TO 'STANDARD';")
    op.create_check_constraint(
        table_name="alert_webhooks",
        constraint_name="additional_arguments_value_correctness",
        condition=textwrap.dedent("""
            JSONB_TYPEOF(additional_arguments) = 'object'
            AND CASE
                WHEN kind = 'STANDARD' THEN
                    TRUE
                WHEN kind = 'PAGER_DUTY' THEN
                    additional_arguments ? 'routing_key'
                    AND JSONB_TYPEOF(additional_arguments -> 'routing_key') = 'string'
                    AND additional_arguments ? 'group'
                    AND JSONB_TYPEOF(additional_arguments -> 'group') = 'string'
                    AND additional_arguments ? 'class'
                    AND JSONB_TYPEOF(additional_arguments -> 'class') = 'string'
                ELSE
                    FALSE
            END
        """)
    )


def downgrade() -> None:
    op.execute("ALTER TABLE alert_webhooks DROP CONSTRAINT IF EXISTS additional_arguments_value_correctness;")
    op.execute("ALTER TYPE webhookkind RENAME VALUE 'STANDARD' TO 'STANDART';")
    op.create_check_constraint(
        table_name="alert_webhooks",
        constraint_name="additional_arguments_value_correctness",
        condition=textwrap.dedent("""
            JSONB_TYPEOF(additional_arguments) = 'object'
            AND CASE
                WHEN kind = 'STANDART' THEN
                    TRUE
                WHEN kind = 'PAGER_DUTY' THEN
                    additional_arguments ? 'routing_key'
                    AND JSONB_TYPEOF(additional_arguments -> 'routing_key') = 'string'
                    AND additional_arguments ? 'group'
                    AND JSONB_TYPEOF(additional_arguments -> 'group') = 'string'
                    AND additional_arguments ? 'class'
                    AND JSONB_TYPEOF(additional_arguments -> 'class') = 'string'
                ELSE
                    FALSE
            END
        """)
    )

