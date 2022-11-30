# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Organiztaion entity model."""
import typing as t
from random import choice
from string import ascii_lowercase

import sqlalchemy as sa
from slugify import slugify
from sqlalchemy.orm import Mapped, relationship
from typing_extensions import Self

from deepchecks_monitoring.public_models import AlertSeverity, Base
from deepchecks_monitoring.utils.database import SchemaBuilder

if t.TYPE_CHECKING:
    from . import Invitation, User  # pylint: disable=unused-import

__all__ = ["Organization"]


class Organization(Base):
    """Organization model."""

    __tablename__ = "organizations"

    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String(100), unique=False, nullable=False)
    schema_name = sa.Column(sa.String(100), unique=True, nullable=False)

    slack_notification_levels = sa.Column(
        sa.ARRAY(sa.Enum(AlertSeverity)),
        default=[],
        nullable=False
    )
    email_notification_levels = sa.Column(
        sa.ARRAY(sa.Enum(AlertSeverity)),
        default=[],
        nullable=False
    )

    invitations: t.List[Mapped["Invitation"]] = relationship(
        "Invitation",
        back_populates="organization",
        cascade="save-update, merge, delete",
        passive_deletes=True,
        passive_updates=True,
    )

    # Class methods
    # ========================

    @classmethod
    async def create_for_user(
        cls: t.Type[Self],
        owner: "User",
        name: str
    ) -> Self:
        """Create a new organization for a user."""
        org = Organization(name=name, schema_name=cls.generate_schema_name(name))
        owner.organization = org
        owner.is_admin = True
        return org

    @classmethod
    def generate_schema_name(cls, org_name: str) -> str:
        """Generate a random schema name."""
        slug = slugify(org_name, separator="_")
        postfix = "".join(choice(ascii_lowercase) for _ in range(5))
        return f"org_{slug}_{postfix}"

    # Instance Properties
    # ===================

    @property
    def schema_builder(self) -> SchemaBuilder:
        """Return a Schema builder instance for this organization."""
        return SchemaBuilder(
            t.cast(str, self.schema_name),
            migrations_location="deepchecks_monitoring:schema_migrations"
        )
