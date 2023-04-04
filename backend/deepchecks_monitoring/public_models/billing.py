# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Billing entity model."""
import typing as t

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.public_models import Base

if t.TYPE_CHECKING:
    from deepchecks_monitoring.public_models import Organization  # pylint: disable=unused-import

__all__ = ["Billing"]


class Billing(Base):
    """Billing model."""

    __tablename__ = "billing"

    id = sa.Column(sa.Integer, primary_key=True)
    subscription_id = sa.Column(sa.String(100), nullable=True)
    bought_models = sa.Column(sa.Integer, nullable=False, server_default=sa.literal(0))
    last_update = sa.Column(sa.DateTime(timezone=True), nullable=True, onupdate=sa.func.now())
    started_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())

    organization_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("organizations.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False
    )
    organization: Mapped["Organization"] = relationship(
        "Organization",
        lazy="joined"
    )
