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
from datetime import datetime

import pendulum as pdl
from sqlalchemy import func, select

from deepchecks_monitoring.schema_models import Alert, AlertRule, Check, Monitor

AlertsCountPerModel = (
    select(Check.model_id, func.count(Alert.id), func.max(AlertRule.alert_severity_index))
    .join(Check.monitors)
    .join(Monitor.alert_rules)
    .join(AlertRule.alerts)
    .where(Alert.resolved.is_(False))
    .group_by(Check.model_id)
)


MonitorsCountPerModel = (
    select(Check.model_id, func.count(Monitor.id))
    .join(Check.monitors)
    .group_by(Check.model_id)
)


def floor_window_for_time(time: datetime, frequency: int) -> pdl.DateTime:
    """Return the closest round window for the given time. if the time is round return itself, else returns \
    the closest window from the bottom.

    Parameters
    ----------
    time: pdl.DateTime
    frequency: int

    Returns
    -------
    pdl.DateTime
        The time of the end of the window
    """
    num_windows_from_origin = (int(time.timestamp()) // frequency)
    return pdl.from_timestamp(num_windows_from_origin * frequency)
