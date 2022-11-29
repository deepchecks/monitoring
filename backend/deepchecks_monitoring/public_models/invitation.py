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
import typing as t
from dataclasses import dataclass

import sqlalchemy as sa
from pendulum.datetime import DateTime as PendulumDateTime
from sqlalchemy import Table
from sqlalchemy.orm import relationship

from deepchecks_monitoring.public_models import Base

__all__ = ['Invitation']


@dataclass
class Invitation(Base):
    """Invitation model."""

    __table__ = Table(
        'invitations',
        Base.metadata,
        sa.Column('email', sa.String(100), unique=True, primary_key=True),
        sa.Column(
            'organization_id',
            sa.Integer,
            sa.ForeignKey('organizations.id', ondelete='CASCADE'),
            primary_key=True
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('creating_user', sa.String(100), nullable=False),
        sa.Column('ttl', sa.Integer, nullable=True),
        schema='public'
    )

    email: str
    organization_id: int
    creating_user: str
    created_at: t.Optional[PendulumDateTime] = None
    ttl: t.Optional[int] = None

    __mapper_args__ = {  # type: ignore
        'properties': {
            'organization': relationship('Organization')
        }
    }
