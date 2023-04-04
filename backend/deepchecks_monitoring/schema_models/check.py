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

from deepchecks import BaseCheck
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.monitoring_utils import MetadataMixin
from deepchecks_monitoring.schema_models.base import Base

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models import Model, Monitor  # pylint: disable=unused-import

__all__ = ["Check"]


_DOCS_LINK_FORMAT = "https://docs.deepchecks.com/stable/checks_gallery/{data_type}/{check_type}/plot_{check_name}.html"


class Check(Base, MetadataMixin):
    """ORM model for the check."""

    __tablename__ = "checks"
    __table_args__ = (UniqueConstraint("name", "model_id"),)

    id = Column(Integer, primary_key=True)
    name = Column(String(50))
    config = Column(JSONB)
    is_label_required = Column(Boolean, nullable=False)
    is_reference_required = Column(Boolean, nullable=False)

    model_id = Column(
        Integer,
        ForeignKey("models.id", ondelete="CASCADE", onupdate="RESTRICT"),
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
        package_module, data_type, checks_submodule, check_type, check_name = \
            check.__module__.split(".")  # pylint: disable=unused-variable
        # for future custom checks
        if package_module != "deepchecks":
            return None
        return _DOCS_LINK_FORMAT.format(data_type=data_type, check_type=check_type, check_name=check_name)
