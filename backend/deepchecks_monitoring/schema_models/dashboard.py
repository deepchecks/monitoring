# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the Dashboard ORM model."""
import typing as t

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.schema_models.base import Base

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models.monitor import Monitor  # pylint: disable=unused-import

__all__ = ["Dashboard"]


class Dashboard(Base):
    """ORM model for the dashboard."""

    __tablename__ = "dashboards"

    id = Column(Integer, primary_key=True)
    name = Column(String(50))

    monitors: Mapped[t.List["Monitor"]] = relationship(
        "Monitor",
        back_populates="dashboard",
        passive_updates=True
    )
