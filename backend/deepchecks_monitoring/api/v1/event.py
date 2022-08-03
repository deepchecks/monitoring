# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""V1 API of the check."""
import typing as t

import pendulum as pdl
from fastapi import Response, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.models import Check
from deepchecks_monitoring.models.event import Event
from deepchecks_monitoring.utils import CountResponse, exists_or_404, fetch_or_404

from .router import router


class EventSchema(BaseModel):
    """Schema for the event."""

    id: int
    alert_id: int
    failed_values: t.Dict[str, t.List[str]]
    date: pdl.DateTime
    created_at: pdl.DateTime

    class Config:
        """Config for Event schema."""

        orm_mode = True


@router.get("/events/count", response_model=CountResponse)
@router.get("/alerts/{alert_id}/events/count", response_model=CountResponse)
async def count_events(
    alert_id: t.Optional[int] = None,
    session: AsyncSession = AsyncSessionDep
):
    """Count events."""
    select_event = select(Event)
    if alert_id:
        select_event = select_event.join(Event.check).where(Check.alert_id == alert_id)
    results = await session.execute(select(func.count()).select_from(select_event))
    total = results.scalars().one()

    return {"count": total}


@router.get("/events/{event_id}", response_model=EventSchema)
async def get_event(
    event_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Get event by id."""
    event = await fetch_or_404(session, Event, id=event_id)
    return EventSchema.from_orm(event)


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Delete event by id."""
    await exists_or_404(session, Event, id=event_id)
    await Event.delete(session, event_id)
    return Response(status_code=status.HTTP_200_OK)
