"""fix_role_order

Revision ID: 6dc7e5b8a608
Revises: 57a5a7543c41
Create Date: 2023-06-18 14:46:16.527436

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '6dc7e5b8a608'
down_revision = '57a5a7543c41'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('''ALTER TYPE "roleenum" RENAME TO "roleenum_old"''')
    op.execute('''CREATE TYPE "roleenum" AS ENUM('ADMIN', 'OWNER')''')
    op.execute((
        '''ALTER TABLE roles ALTER COLUMN role TYPE "roleenum" USING '''
        '''role::text::"roleenum"'''
    ))
    op.execute('''DROP TYPE "roleenum_old"''')


def downgrade() -> None:
    op.execute('''ALTER TYPE "roleenum" RENAME TO "roleenum_old"''')
    op.execute('''CREATE TYPE "roleenum" AS ENUM('OWNER', 'ADMIN')''')
    op.execute((
        '''ALTER TABLE roles ALTER COLUMN role TYPE "roleenum" USING '''
        '''role::text::"roleenum"'''
    ))
    op.execute('''DROP TYPE "roleenum_old"''')
