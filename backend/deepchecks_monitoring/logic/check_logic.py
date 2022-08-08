# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining utility functions for check running."""
import typing as t

import pendulum as pdl
from deepchecks import BaseCheck, SingleDatasetBaseCheck, TrainTestBaseCheck
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from deepchecks_monitoring.api.v1.alert import AlertCheckOptions
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.exceptions import NotFound
from deepchecks_monitoring.logic.model_logic import (create_model_version_select_object,
                                                     filter_monitor_table_by_window_and_data_filters,
                                                     filter_table_selection_by_data_filters,
                                                     get_model_versions_and_task_type_per_time_window,
                                                     get_results_for_active_model_version_sessions_per_window)
from deepchecks_monitoring.models.alert import Alert
from deepchecks_monitoring.models.check import Check
from deepchecks_monitoring.models.event import Event
from deepchecks_monitoring.utils import DataFilterList, fetch_or_404, make_oparator_func


class FilterWindowOptions(BaseModel):
    """Window with filter run schema."""

    start_time: str
    end_time: str
    filter: t.Optional[DataFilterList] = None
    model_version_ids: t.Optional[t.Union[t.List[int], None]] = None


async def run_check_alert(
    check_id: int,
    alert_check_options: AlertCheckOptions,
    session: AsyncSession = AsyncSessionDep

):
    """Run a check in the time window for each alert and create event accordingly.

    Parameters
    ----------
    check_id : int
        ID of the check.
    alert_check_options : AlertCheckOptions
        The alert check options.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    t.Dict
        {<alert_id>: {<event_id>: {<version_id>: [<failed_values>]}}}.
    """
    # get the relevant objects from the db
    check_results = await session.execute(select(Check).where(Check.id == check_id).options(selectinload(Check.alerts)))
    check: Check = check_results.scalars().first()

    if len(check.alerts) == 0:
        raise ValueError("No alerts related to the check were found")

    end_time = pdl.parse(alert_check_options.end_time)

    all_events_dict = {}
    for alert in check.alerts:
        start_time = end_time - pdl.duration(seconds=alert.lookback)
        # make sure this event is in the correct window for the alert
        if alert.last_run is not None and alert.last_run != end_time and \
                alert.last_run + pdl.duration(seconds=alert.repeat_every) > start_time:
            continue

        await Alert.update(session, alert.id, {"last_run": end_time})

        # get relevant model_versions for that time window
        model_versions, _ = await get_model_versions_and_task_type_per_time_window(session,
                                                                                   check,
                                                                                   start_time,
                                                                                   end_time)

        # get the event for this window (if exists)
        event_results = await session.execute(select(Event)
                                              .where(Event.alert_id == alert.id)
                                              .where(Event.start_time == start_time)
                                              .where(Event.end_time == end_time))
        event: Event = event_results.scalars().first()

        if event is None:
            event_dict = {}
        else:
            event_dict = event.failed_values

        alert_condition_func = make_oparator_func(alert.alert_rule.operator)
        alert_condition_val = alert.alert_rule.value

        # filter model versions that didn't send newer data (if in the grace period)
        # filter model versions that already have data in the event
        relevant_model_versions: t.List[str] = [
            str(version.id) for version in model_versions
            if (not alert_check_options.grace_period or version.end_time >= end_time) and version.id not in event_dict]

        # run check for the relevant window and data filter
        check_alert_check_options = FilterWindowOptions(start_time=start_time.isoformat(),
                                                        end_time=end_time.isoformat(),
                                                        data_filter=alert.data_filters,
                                                        model_version_ids=relevant_model_versions)
        check_results = await run_check_window(check.id, check_alert_check_options, session)

        # test if any results raise an alert
        for model_version_id, results in check_results.items():
            if results is None:
                event_dict[str(model_version_id)] = []
            failed_vals = []
            for val_name, value in results.items():
                if alert.alert_rule.feature is None or alert.alert_rule.feature == val_name:
                    if alert_condition_func(value, alert_condition_val):
                        failed_vals.append(val_name)
            event_dict[str(model_version_id)] = failed_vals

        if len(event_dict) > 0:
            if event is not None:
                if event_dict != event.failed_values:
                    await Event.update(session, event.id, {"failed_values": event_dict})
            else:
                event = Event(alert_id=alert.id, start_time=start_time, end_time=end_time, failed_values=event_dict)
                session.add(event)
                await session.flush()

        all_events_dict[alert.id] = {"failed_values": event_dict, "event_id": event.id}
    return all_events_dict


async def run_check_window(
    check_id: int,
    window_options: FilterWindowOptions,
    session: AsyncSession = AsyncSessionDep
):
    """Run a check for each time window by lookback.

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
    # get the relevant objects from the db
    check = await fetch_or_404(session, Check, id=check_id)
    dp_check = BaseCheck.from_config(check.config)
    if not isinstance(dp_check, (SingleDatasetBaseCheck, TrainTestBaseCheck)):
        raise ValueError("incompatible check type")

    start_time = pdl.parse(window_options.start_time)
    end_time = pdl.parse(window_options.end_time)

    model_versions, task_type = \
        await get_model_versions_and_task_type_per_time_window(session, check, start_time, end_time)

    if len(model_versions) == 0:
        raise NotFound("No relevant model versions found")

    top_feat, _ = model_versions[0].get_top_features()

    # execute an async session per each model version
    model_versions_sessions: t.List[t.Tuple[t.Coroutine, t.List[t.Coroutine]]] = []
    for model_version in model_versions:
        if window_options.model_version_ids is not None and \
                model_version.id not in window_options.model_version_ids:
            continue
        if isinstance(dp_check, TrainTestBaseCheck):
            refrence_table = model_version.get_reference_table(session)
            refrence_table_data_session = create_model_version_select_object(task_type, refrence_table, top_feat)
            if window_options.filter:
                refrence_table_data_session = filter_table_selection_by_data_filters(
                    refrence_table_data_session, window_options.filter)
            refrence_table_data_session = session.execute(refrence_table_data_session)
        else:
            refrence_table_data_session = None

        test_table = model_version.get_monitor_table(session)
        test_data_session = []

        select_obj = create_model_version_select_object(task_type, test_table, top_feat)
        # create the session
        filtered_select_obj = filter_monitor_table_by_window_and_data_filters(model_version=model_version,
                                                                              table_selection=select_obj,
                                                                              mon_table=test_table,
                                                                              data_filters=window_options.filter,
                                                                              start_time=start_time,
                                                                              end_time=end_time)
        if filtered_select_obj is not None:
            test_data_session.append(session.execute(filtered_select_obj))
        else:
            test_data_session.append(None)

        model_versions_sessions.append((refrence_table_data_session, test_data_session))

    # get result from active sessions and run the check per each model version
    model_reduces_per_window = await get_results_for_active_model_version_sessions_per_window(model_versions_sessions,
                                                                                              model_versions,
                                                                                              dp_check)
    # the original function is more general and runs it per window, we have only 1 window here
    model_reduces = {}
    for model_id, reduces_per_window in model_reduces_per_window.items():
        model_reduces[model_id] = None if reduces_per_window is None else reduces_per_window[0]
    return model_reduces
