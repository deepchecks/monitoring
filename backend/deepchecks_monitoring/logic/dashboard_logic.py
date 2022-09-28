# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining utility functions for dashboard running."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from deepchecks_monitoring.models import Check
from deepchecks_monitoring.models.dashboard import Dashboard
from deepchecks_monitoring.models.monitor import Monitor


async def create_default_dashboard(monitor_options, session: AsyncSession, max_num_monitors: int = 5,
                                   lookback: int = 30 * 86400, frequency: int = 86400,
                                   aggregation_window: int = 86400):
    """Create default dashboard."""
    dashboard = Dashboard()
    session.add(dashboard)
    await session.flush()
    default_checks = ['TrainTestLabelDrift', 'SingleDatasetPerformance', 'TrainTestFeatureDrift',
                      'TrainTestPredictionDrift', 'ImagePropertyDrift']
    check_select: Select = select(Check).where(Check.config['class_name'].astext.in_(default_checks))
    checks_to_monitor = (await session.execute(check_select)).scalars().all()[:max_num_monitors]
    monitors = []
    for check in checks_to_monitor:
        monitor = Monitor(name=check.name + ' Monitor', check_id=check.id,
                          lookback=lookback, frequency=frequency, aggregation_window=aggregation_window,
                          dashboard_id=dashboard.id)
        session.add(monitor)
        await session.flush()
        monitor_query = select(Monitor).where(Monitor.id == monitor.id).options(*monitor_options)
        monitor = (await session.execute(monitor_query)).scalars().first()
        monitors.append(monitor)
    return dashboard, monitors
