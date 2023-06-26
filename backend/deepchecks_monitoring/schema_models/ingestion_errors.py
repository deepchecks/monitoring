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

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.schema_models.base import Base
from deepchecks_monitoring.schema_models.permission_mixin import PermissionMixin

if t.TYPE_CHECKING:
    # pylint: disable=unused-import
    from deepchecks_monitoring.schema_models import Model
    from deepchecks_monitoring.schema_models.model_version import ModelVersion


__all__ = ["IngestionError"]


class IngestionError(Base, PermissionMixin):
    """ORM model for ingestion error."""

    __tablename__ = "ingestion_errors"

    id = sa.Column(sa.Integer, primary_key=True)
    created_at = sa.Column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now()
    )
    sample = sa.Column(sa.String)
    sample_id = sa.Column(sa.String, nullable=True)
    error = sa.Column(sa.String, index=True)

    model_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("models.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=True,
        index=True
    )
    model: Mapped["Model"] = relationship(
        "Model",
        back_populates="ingestion_errors"
    )

    model_version_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("model_versions.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=True,
        index=True
    )
    model_version: Mapped["ModelVersion"] = relationship(
        "ModelVersion",
        back_populates="ingestion_errors"
    )

    @classmethod
    async def has_object_permissions(cls, session, obj_id, user):
        # pylint: disable=redefined-outer-name,import-outside-toplevel
        from deepchecks_monitoring.schema_models.model import Model
        from deepchecks_monitoring.schema_models.model_memeber import ModelMember
        from deepchecks_monitoring.schema_models.model_version import ModelVersion

        return await session.scalar(sa.select(1)
                                    .join(IngestionError.model_version)
                                    .join(ModelVersion.model)
                                    .join(Model.members)
                                    .where(ModelMember.user_id == user.id)
                                    .where(cls.id == obj_id))
