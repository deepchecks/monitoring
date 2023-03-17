# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Invitation entity model."""
import pendulum as pdl
import sqlalchemy as sa
from sqlalchemy.orm import relationship

from deepchecks_monitoring.public_models import Base

__all__ = ['Invitation']


class Invitation(Base):
    """Invitation model."""

    __tablename__ = 'invitations'

    email = sa.Column(sa.String(100), unique=True, primary_key=True)

    organization_id = sa.Column(
        sa.Integer,
        sa.ForeignKey('organizations.id', ondelete='CASCADE', onupdate='RESTRICT'),
        primary_key=True
    )

    # TODO: why 'creating_user' is not a foreign key to the users table?
    creating_user = sa.Column(sa.String(100), nullable=False)
    created_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    ttl = sa.Column(sa.Integer, nullable=True)

    organization = relationship('Organization')

    def expired(self):
        """Check whether invitation is expired or not."""
        return self.ttl and pdl.instance(self.created_at).add(seconds=self.ttl) > pdl.now()
