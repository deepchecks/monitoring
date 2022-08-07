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
from deepchecks import BaseCheck, SingleDatasetBaseCheck, TrainTestBaseCheck
from deepchecks.core.checks import CheckConfig
from fastapi import Response, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql.selectable import Select

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.logic.check_logic import FilterWindowOptions, run_check_window
from deepchecks_monitoring.logic.model_logic import (create_model_version_select_object,
                                                     filter_monitor_table_by_window_and_data_filter,
                                                     filter_table_selection_by_data_filter,
                                                     get_model_versions_and_task_type_per_time_window,
                                                     get_results_for_active_model_version_sessions_per_window)
from deepchecks_monitoring.models import Check, Model
from deepchecks_monitoring.utils import DataFilter, IdResponse, exists_or_404, fetch_or_404

from ...config import Tags
from .router import router


class CheckCreationSchema(BaseModel):
    """Check schema."""

    config: CheckConfig
    name: t.Optional[str] = None

    class Config:
        """Schema config."""

        orm_mode = True


class CheckSchema(BaseModel):
    """Schema for the check."""

    config: CheckConfig
    model_id: int
    id: int
    name: str = None

    class Config:
        """Config for Alert schema."""

        orm_mode = True


class MonitorOptions(BaseModel):
    """Monitor run schema."""

    lookback: int
    filter: t.Optional[DataFilter] = None


class CheckResultSchema(BaseModel):
    """Check run result schema."""

    output: t.Dict
    time_labels: t.List[str]


@router.post('/models/{model_id}/checks', response_model=IdResponse, tags=[Tags.CHECKS])
async def create_check(
    model_id: int,
    check: CheckCreationSchema,
    session: AsyncSession = AsyncSessionDep
) -> dict:
    """Create a new check.

    Parameters
    ----------
    model_id : int
        ID of the model.
    check : CheckCreationSchema
        Check to create.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    int
        The check id.
    """
    await exists_or_404(session, Model, id=model_id)
    check = Check(model_id=model_id, **check.dict(exclude_none=True))
    session.add(check)
    await session.flush()
    return {'id': check.id}


@router.get('/models/{model_id}/checks', response_model=t.List[CheckSchema], tags=[Tags.CHECKS])
async def get_checks(
    model_id: int,
    session: AsyncSession = AsyncSessionDep
) -> dict:
    """Return all the checks for a given model.

    Parameters
    ----------
    model_id : int
        ID of the model.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    List[CheckSchema]
        All the checks for a given model.
    """
    await exists_or_404(session, Model, id=model_id)
    select_checks: Select = select(Check)
    select_checks = select_checks.where(Check.model_id == model_id)
    results = await session.execute(select_checks)
    return [CheckSchema.from_orm(res) for res in results.scalars().all()]


@router.post('/checks/{check_id}/run/lookback', response_model=CheckResultSchema, tags=[Tags.CHECKS])
async def run_check_lookback(
    check_id: int,
    monitor_options: MonitorOptions,
    session: AsyncSession = AsyncSessionDep
):
    """Run a check for each time window by lookback.

    Parameters
    ----------
    check_id : int
        ID of the check.
    monitor_options : MonitorOptions
        The monitor options.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    CheckSchema
        Created check.
    """
    # get the time window size
    curr_time: pdl.DateTime = pdl.now().add(minutes=30).set(minute=0, second=0, microsecond=0)
    lookback_duration = pdl.duration(seconds=monitor_options.lookback)
    if lookback_duration < pdl.duration(days=2):
        window = pdl.duration(hours=1)
    elif lookback_duration < pdl.duration(days=8):
        window = pdl.duration(days=1)
    else:
        window = pdl.duration(weeks=1)

    # get the relevant objects from the db
    check = await fetch_or_404(session, Check, id=check_id)
    dp_check = BaseCheck.from_config(check.config)
    if not isinstance(dp_check, (SingleDatasetBaseCheck, TrainTestBaseCheck)):
        raise ValueError('incompatible check type')

    start_time = curr_time - lookback_duration

    model_versions, task_type = \
        await get_model_versions_and_task_type_per_time_window(session, check, start_time, curr_time)

    if len(model_versions) == 0:
        return Response('No relevant model versions found', status_code=status.HTTP_404_NOT_FOUND)

    top_feat, _ = model_versions[0].get_top_features()

    # execute an async session per each model version
    model_versions_sessions: t.List[t.Tuple[t.Coroutine, t.List[t.Coroutine]]] = []
    for model_version in model_versions:
        if isinstance(dp_check, TrainTestBaseCheck):
            refrence_table = model_version.get_reference_table(session)
            refrence_table_data_session = create_model_version_select_object(task_type, refrence_table, top_feat)
            if monitor_options.filter:
                refrence_table_data_session = filter_table_selection_by_data_filter(
                    refrence_table_data_session, monitor_options.filter)
            refrence_table_data_session = session.execute(refrence_table_data_session)
        else:
            refrence_table_data_session = None

        test_table = model_version.get_monitor_table(session)
        test_data_sessions = []

        select_obj = create_model_version_select_object(task_type, test_table, top_feat)
        start_time = curr_time - lookback_duration
        # create the session per time window
        while start_time < curr_time:
            filtered_select_obj = filter_monitor_table_by_window_and_data_filter(model_version=model_version,
                                                                                 table_selection=select_obj,
                                                                                 mon_table=test_table,
                                                                                 data_filter=monitor_options.filter,
                                                                                 start_time=start_time,
                                                                                 end_time=start_time + window)
            if filtered_select_obj is not None:
                test_data_sessions.append(session.execute(filtered_select_obj))
            else:
                test_data_sessions.append(None)
            start_time = start_time + window
        model_versions_sessions.append((refrence_table_data_session, test_data_sessions))

    # get result from active sessions and run the check per each model version
    model_reduces = await get_results_for_active_model_version_sessions_per_window(model_versions_sessions,
                                                                                   model_versions,
                                                                                   dp_check)

    # get the time windows that were used
    time_windows = []
    start_time = curr_time - lookback_duration
    while start_time < curr_time:
        time_windows.append(start_time.isoformat())
        start_time = start_time + window

    return {'output': model_reduces, 'time_labels': time_windows}


@router.post('/checks/{check_id}/run/window', tags=[Tags.CHECKS])
async def get_check_window(
    check_id: int,
    window_options: FilterWindowOptions,
    session: AsyncSession = AsyncSessionDep
):
    """Run a check for the time window.

    Parameters
    ----------
    check_id : int
        ID of the check.
    window_options : FilterWindowOptions
        The window options.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    CheckSchema
        Created check.
    """
    return await run_check_window(check_id, window_options, session)
