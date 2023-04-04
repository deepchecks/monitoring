"""add invitation delete cascade

Revision ID: 8237ac7f9358
Revises: 758b53d8f12c
Create Date: 2022-11-09 13:26:02.379582

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '8237ac7f9358'
down_revision = '758b53d8f12c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint('invitations_organization_id_fkey', 'invitations')
    op.create_foreign_key('invitations_organization_id_fkey',
                          'invitations', 'organizations', ['organization_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    op.drop_constraint('invitations_organization_id_fkey', 'invitations')
    op.create_foreign_key('invitations_organization_id_fkey',
                          'invitations', 'organizations', ['organization_id'], ['id'])
