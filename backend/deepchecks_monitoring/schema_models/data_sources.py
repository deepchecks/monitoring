# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the Data sources ORM model."""
from sqlalchemy import Column, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

from deepchecks_monitoring.schema_models.base import Base

__all__ = ["DataSource"]


class DataSource(Base):
    """ORM model for the dashboard."""

    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True)
    type = Column(String(50))
    parameters = Column(JSONB)
