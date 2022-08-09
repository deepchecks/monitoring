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

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.exceptions import NotFound
from deepchecks_monitoring.logic.model_logic import (create_model_version_select_object,
                                                     filter_monitor_table_by_window_and_data_filters,
                                                     filter_table_selection_by_data_filters,
                                                     get_model_versions_and_task_type_per_time_window,
                                                     get_results_for_active_model_version_sessions_per_window)
from deepchecks_monitoring.models.alert import Alert
from deepchecks_monitoring.models.alert_rule import AlertRule
from deepchecks_monitoring.models.check import Check
from deepchecks_monitoring.utils import DataFilterList, fetch_or_404, make_oparator_func


class AlertCheckOptions(BaseModel):
    """Alert check schema."""

    end_time: str
    grace_period: t.Optional[bool] = True


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
        {<alert_rule_id>: {<alert_id>: {<version_id>: [<failed_values>]}}}.
    """
    # get the relevant objects from the db
    check_results = await session.execute(select(Check).where(Check.id == check_id)
                                          .options(selectinload(Check.alert_rules)))
    check: Check = check_results.scalars().first()

    if len(check.alert_rules) == 0:
        raise ValueError("No alert rules related to the check were found")

    end_time = pdl.parse(alert_check_options.end_time)

    all_alerts_dict = {}
    for alert_rule in check.alert_rules:
        start_time = end_time - pdl.duration(seconds=alert_rule.lookback)
        # make sure this alert is in the correct window for the alert rule
        if alert_rule.last_run is not None and alert_rule.last_run != end_time and \
                alert_rule.last_run + pdl.duration(seconds=alert_rule.repeat_every) > start_time:
            continue

        await AlertRule.update(session, alert_rule.id, {"last_run": end_time})

        # get relevant model_versions for that time window
        model_versions, _ = await get_model_versions_and_task_type_per_time_window(session,
                                                                                   check,
                                                                                   start_time,
                                                                                   end_time)

        # get the alert for this window (if exists)
        alert_results = await session.execute(select(Alert)
                                              .where(Alert.alert_rule_id == alert_rule.id)
                                              .where(Alert.start_time == start_time)
                                              .where(Alert.end_time == end_time))
        alert: Alert = alert_results.scalars().first()

        if alert is None:
            alert_dict = {}
        else:
            alert_dict = alert.failed_values

        alert_condition_func = make_oparator_func(alert_rule.condition.operator)
        alert_condition_val = alert_rule.condition.value

        # filter model versions that didn't send newer data (if in the grace period)
        # filter model versions that already have data in the event
        relevant_model_versions: t.List[str] = [
            str(version.id) for version in model_versions
            if (not alert_check_options.grace_period or version.end_time >= end_time) and version.id not in alert_dict]

        # run check for the relevant window and data filter
        check_alert_check_options = FilterWindowOptions(start_time=start_time.isoformat(),
                                                        end_time=end_time.isoformat(),
                                                        data_filter=alert_rule.data_filters,
                                                        model_version_ids=relevant_model_versions)
        check_results = await run_check_window(check.id, check_alert_check_options, session)

        # test if any results raise an alert
        for model_version_id, results in check_results.items():
            if results is None:
                alert_dict[str(model_version_id)] = []
            failed_vals = []
            for val_name, value in results.items():
                if alert_rule.condition.feature is None or alert_rule.condition.feature == val_name:
                    if alert_condition_func(value, alert_condition_val):
                        failed_vals.append(val_name)
            alert_dict[str(model_version_id)] = failed_vals

        if len(alert_dict) > 0:
            if alert is not None:
                if alert_dict != alert.failed_values:
                    await Alert.update(session, alert.id, {"failed_values": alert_dict})
            else:
                alert = Alert(alert_rule_id=alert_rule.id, start_time=start_time, end_time=end_time,
                              failed_values=alert_dict)
                session.add(alert)
                await session.flush()

        all_alerts_dict[alert_rule.id] = {"failed_values": alert_dict, "alert_id": alert.id}
    return all_alerts_dict


async def run_check_per_window_in_range(
    check_id: int,
    start_time: pdl.DateTime,
    end_time: pdl.DateTime,
    window: pdl.DateTime,
    monitor_filter: DataFilterList,
    session: AsyncSession
) -> t.Dict[str, t.Any]:
    """Run a check on a monitor table per time window in the time range.

    The function gets the relevant model versions and the task type of the check.
    Then, it creates a session per model version and per time window.
    The sessions are executed and the results are returned.
    The results are then used to run the check.
    The function returns the results of the check and the time windows that were used.

    Parameters
    ----------
    check_id : int
        The id of the check to run.
    start_time : pdl.DateTime
        The start time of the check.
    end_time : pdl.DateTime
        The end time of the check.
    window : pdl.DateTime
        The time window to run the check on.
    monitor_filter : DataFilterList
        The data filter to apply on the monitor table.
    session : AsyncSession
        The database session to use.

    Returns
    -------
    dict
        A dictionary containing the output of the check and the time labels.
    """
    # get the relevant objects from the db
    check = await fetch_or_404(session, Check, id=check_id)
    dp_check = BaseCheck.from_config(check.config)
    if not isinstance(dp_check, (SingleDatasetBaseCheck, TrainTestBaseCheck)):
        raise ValueError("incompatible check type")

    model_versions, task_type = \
        await get_model_versions_and_task_type_per_time_window(session, check, start_time, end_time)

    if len(model_versions) == 0:
        raise NotFound("No relevant model versions found")

    top_feat, _ = model_versions[0].get_top_features()

    # execute an async session per each model version
    model_versions_sessions: t.List[t.Tuple[t.Coroutine, t.List[t.Coroutine]]] = []
    for model_version in model_versions:
        if isinstance(dp_check, TrainTestBaseCheck):
            refrence_table = model_version.get_reference_table(session)
            refrence_table_data_session = create_model_version_select_object(task_type, refrence_table, top_feat)
            if monitor_filter:
                refrence_table_data_session = filter_table_selection_by_data_filters(refrence_table,
                                                                                     refrence_table_data_session,
                                                                                     monitor_filter)
            refrence_table_data_session = session.execute(refrence_table_data_session)
        else:
            refrence_table_data_session = None

        test_table = model_version.get_monitor_table(session)
        test_data_sessions = []

        select_obj = create_model_version_select_object(task_type, test_table, top_feat)
        new_start_time = start_time
        # create the session per time window
        while new_start_time < end_time:
            filtered_select_obj = filter_monitor_table_by_window_and_data_filters(model_version=model_version,
                                                                                  table_selection=select_obj,
                                                                                  mon_table=test_table,
                                                                                  data_filters=monitor_filter,
                                                                                  start_time=new_start_time,
                                                                                  end_time=new_start_time + window)
            if filtered_select_obj is not None:
                test_data_sessions.append(session.execute(filtered_select_obj))
            else:
                test_data_sessions.append(None)
            new_start_time = new_start_time + window
        model_versions_sessions.append((refrence_table_data_session, test_data_sessions))

    # get result from active sessions and run the check per each model version
    model_reduces = await get_results_for_active_model_version_sessions_per_window(model_versions_sessions,
                                                                                   model_versions,
                                                                                   dp_check)

    # get the time windows that were used
    time_windows = []
    while start_time < end_time:
        time_windows.append(start_time.isoformat())
        start_time = start_time + window

    return {"output": model_reduces, "time_labels": time_windows}


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
                refrence_table_data_session = filter_table_selection_by_data_filters(refrence_table,
                                                                                     refrence_table_data_session,
                                                                                     window_options.filter)
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
