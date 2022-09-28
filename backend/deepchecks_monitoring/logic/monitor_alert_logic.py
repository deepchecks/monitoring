# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining utility functions for alerts."""
from typing import Tuple

import pendulum as pdl
from sqlalchemy import false, func, select

from deepchecks_monitoring.models import Alert, AlertRule, Check, Monitor

ORIGIN_START_TIME = pdl.from_timestamp(0)


async def get_alerts_per_model(session) -> dict:
    """Get count of active alerts per model id.

    Parameters
    ----------
    session

    Returns
    -------
    dict
    """
    count_alerts = select(Check.model_id, func.count()) \
        .join(Check.monitors).join(Monitor.alert_rules).join(AlertRule.alerts) \
        .where(Alert.resolved == false())
    q = count_alerts.group_by(Check.model_id)
    results = await session.execute(q)
    total = results.all()
    return dict(total)


def get_time_ranges_for_monitor(lookback: int, frequency: int = None, end_time: pdl.DateTime = None) -> \
        Tuple[pdl.DateTime, pdl.DateTime, pdl.Duration]:
    """Return time ranges to run checks on. If no window_size is provided calculates one based on heuristic.

    Parameters
    ----------
    lookback: int
        The size of the time segment to be divided into windows, provided in seconds.
    frequency: int, default: None
        The windows size to divide the lookback segment into. If None is calculated based on lookback parameter.
    end_time: pdl.DateTime, default: None
        The end date of the time segment, If none the end_date is configured to be 30 minutes after current time.
    Returns
    -------
    Tuple[pdl.DateTime, pdl.DateTime, pdl.Duration]
        Representing the start_time, end_time and windows size.
    """
    if end_time is None:
        end_time = pdl.now().set(minute=0, second=0, microsecond=0).add(hours=1)
    end_time.EPOCH = ORIGIN_START_TIME

    frequency = lookback / 12 if frequency is None else frequency

    # start time is calculated such that end_time - look back will fall in [start_time, start_time + window size]
    num_windows_from_start = (end_time.int_timestamp - lookback) // frequency
    start_of_first_window = ORIGIN_START_TIME.add(seconds=num_windows_from_start * frequency)
    return start_of_first_window, end_time, pdl.duration(seconds=frequency)
