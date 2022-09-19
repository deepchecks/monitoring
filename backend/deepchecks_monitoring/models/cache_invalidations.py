# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the ingestion error ORM model."""
import typing as t

import pendulum as pdl
from sqlalchemy import Column, DateTime, ForeignKey, Integer, PrimaryKeyConstraint, func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.models.base import Base

if t.TYPE_CHECKING:
    from deepchecks_monitoring.models.model_version import ModelVersion  # pylint: disable=unused-import


__all__ = ["CacheInvalidation"]

PRIMARY_KEY_CONSTRAINT_NAME = "pk_cache_invalidations_model_version_window"


class CacheInvalidation(Base):
    """ORM model for cache invalidation."""

    __tablename__ = "cache_invalidations"
    __table_args__ = (
        PrimaryKeyConstraint("model_version_id", "time_window", name=PRIMARY_KEY_CONSTRAINT_NAME),
    )

    model_version_id = Column(Integer,
                              ForeignKey("model_versions.id", ondelete="CASCADE", onupdate="RESTRICT"),
                              nullable=False)
    time_window = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)

    model_version: Mapped["ModelVersion"] = relationship(
        "ModelVersion",
    )

    @classmethod
    async def insert_or_update(cls, model_version, timestamps: t.List[pdl.DateTime], session):
        """Insert cache validations entries after rounding the timestamps to hourly windows."""
        rounded_ts_set = {ts.astimezone(pdl.UTC).set(minute=0, second=0, microsecond=0) for ts in timestamps}
        values_for_insert = [{"model_version_id": model_version.id, "time_window": ts, "created_at": func.now()}
                             for ts in rounded_ts_set]

        statement = insert(CacheInvalidation).values(values_for_insert)
        # If primary key already exists, then updating only the created_at field
        statement = statement.on_conflict_do_update(
            constraint=PRIMARY_KEY_CONSTRAINT_NAME, set_={"created_at": statement.excluded.created_at})

        await session.execute(statement)
