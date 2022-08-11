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
from sqlalchemy import false, func, select

from deepchecks_monitoring.models import Alert, AlertRule, Check, Monitor


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
