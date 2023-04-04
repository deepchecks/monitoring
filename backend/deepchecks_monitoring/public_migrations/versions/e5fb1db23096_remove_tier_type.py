"""remove_tier_type

Revision ID: e5fb1db23096
Revises: 2dfbd6158e0d
Create Date: 2023-02-26 11:38:32.173505

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e5fb1db23096'
down_revision = '2dfbd6158e0d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('''ALTER TYPE "org-tier" RENAME TO "org-tier_old"''')
    op.execute('''CREATE TYPE "org-tier" AS ENUM('FREE', 'BASIC', 'SCALE', 'DEDICATED')''')
    op.execute((
        '''ALTER TABLE organizations ALTER COLUMN tier TYPE "org-tier" USING '''
        '''tier::text::"org-tier"'''
    ))
    op.execute('''DROP TYPE "org-tier_old"''')


def downgrade() -> None:
    op.execute('''ALTER TYPE "org-tier" RENAME TO "org-tier_old"''')
    op.execute('''CREATE TYPE "org-tier" AS ENUM('FREE', 'PRO', 'PREMIUM')''')
    op.execute((
        '''ALTER TABLE organizations ALTER COLUMN tier TYPE "org-tier" USING '''
        '''tier::text::"org-tier"'''
    ))
    op.execute('''DROP TYPE "org-tier_old"''')
