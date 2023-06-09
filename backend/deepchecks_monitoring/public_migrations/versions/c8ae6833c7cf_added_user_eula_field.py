"""added user.eula field

Revision ID: c8ae6833c7cf
Revises: 6257d437094a
Create Date: 2022-12-01 12:11:56.816167

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'c8ae6833c7cf'
down_revision = '6257d437094a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('users', sa.Column('eula', sa.Boolean(), server_default=sa.text('FALSE'), nullable=False))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('users', 'eula')
    # ### end Alembic commands ###
