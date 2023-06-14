# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the check ORM model."""
import typing as t

import sqlalchemy as sa
from deepchecks import BaseCheck
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.monitoring_utils import MetadataMixin
from deepchecks_monitoring.schema_models.base import Base
from deepchecks_monitoring.schema_models.permission_mixin import PermissionMixin

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models import Model, Monitor  # pylint: disable=unused-import

__all__ = ["Check"]

_DOCS_LINK_FORMAT = "https://docs.deepchecks.com/stable/{data_type}/auto_checks/{check_type}/plot_{check_name}.html"


class Check(Base, MetadataMixin, PermissionMixin):
    """ORM model for the check."""

    __tablename__ = "checks"
    __table_args__ = (sa.UniqueConstraint("name", "model_id"),)

    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String(50))
    config = sa.Column(JSONB)
    is_label_required = sa.Column(sa.Boolean, nullable=False)
    is_reference_required = sa.Column(sa.Boolean, nullable=False)

    model_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("models.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
    model: Mapped[t.Optional["Model"]] = relationship(
        "Model",
        back_populates="checks"
    )

    monitors: Mapped[t.List["Monitor"]] = relationship(
        "Monitor",
        back_populates="check",
        cascade="save-update, merge, delete",
        passive_deletes=True,
        passive_updates=True
    )

    @property
    def docs_link(self) -> t.Optional[str]:
        # We need to init the check since the module in the config is shortened and does not include check_type
        check = BaseCheck.from_config(self.config)

        # if module isn't deepchecks skip
        if check.__module__.split(".", 2)[0] != "deepchecks":
            return None

        package_module, data_type, checks_submodule, check_type, check_name = \
            check.__module__.split(".")  # pylint: disable=unused-variable
        # for future custom checks
        if package_module != "deepchecks":
            return None
        return _DOCS_LINK_FORMAT.format(data_type=data_type, check_type=check_type, check_name=check_name)

    @classmethod
    async def has_object_permissions(cls, session, obj_id, user):
        # pylint: disable=redefined-outer-name,import-outside-toplevel
        from deepchecks_monitoring.schema_models.check import Check
        from deepchecks_monitoring.schema_models.model import Model
        from deepchecks_monitoring.schema_models.model_memeber import ModelMember

        return await session.scalar(sa.select(1)
                                    .join(Check.model)
                                    .join(Model.members)
                                    .where(ModelMember.user_id == user.id)
                                    .where(cls.id == obj_id))
