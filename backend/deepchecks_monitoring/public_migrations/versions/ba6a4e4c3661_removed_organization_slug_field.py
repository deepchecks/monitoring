"""removed Organization slug field

Revision ID: ba6a4e4c3661
Revises: ed50dfb877d1
Create Date: 2022-10-05 14:46:18.618303
"""
import typing as t

import sqlalchemy as sa
from alembic import op
from sqlalchemy.future.engine import Connection

# revision identifiers, used by Alembic.
revision = 'ba6a4e4c3661'
down_revision = 'ed50dfb877d1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('organizations', 'slug', schema="public")
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    from slugify import slugify

    op.add_column(
        'organizations',
        sa.Column('slug', sa.String(100), unique=False, nullable=False, server_default="''"),
        schema="public"
    )

    context = op.get_context()
    connection = t.cast(Connection, context.connection)

    organizations = sa.table(
        "organizations",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
        sa.column("slug", sa.String),
        schema="public"
    )

    records = connection.execute(sa.select(organizations.c.id, organizations.c.name)).all()

    for org in records:
        connection.execute(
            sa.update(organizations)
            .where(organizations.c.id == org.id)
            .values(slug=slugify(org.name, separator="_"))
        )

    op.execute("ALTER TABLE organizations ALTER COLUMN slug DROP DEFAULT;")
    # ### end Alembic commands ###
