# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""V1 API of the alerts."""
import typing as t

import pendulum as pdl
from fastapi import Response, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.models.alert import Alert
from deepchecks_monitoring.utils import exists_or_404, fetch_or_404

from .router import router


class AlertSchema(BaseModel):
    """Schema for the alert."""

    id: int
    alert_rule_id: int
    failed_values: t.Dict[str, t.List[str]]
    date: pdl.DateTime
    created_at: pdl.DateTime

    class Config:
        """Config for Alert schema."""

        orm_mode = True


@router.get("/alerts/{alert_id}", response_model=AlertSchema, tags=[Tags.ALERTS])
async def get_alert(
    alert_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Get event by id."""
    event = await fetch_or_404(session, Alert, id=alert_id)
    return AlertSchema.from_orm(event)


@router.delete("/alerts/{alert_id}", tags=[Tags.ALERTS])
async def delete_alert(
    alert_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Delete event by id."""
    await exists_or_404(session, Alert, id=alert_id)
    await Alert.delete(session, alert_id)
    return Response(status_code=status.HTTP_200_OK)
