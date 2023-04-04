# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#
# pylint: disable=import-outside-toplevel
import pytest


@pytest.fixture(scope="package", autouse=True)
def _():
    # adding telemetry to make sure that it does not break routines
    from deepchecks_monitoring.bgtasks.core import Worker
    from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler
    from deepchecks_monitoring.ee.utils import telemetry
    from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend

    telemetry.collect_telemetry(Worker)
    telemetry.collect_telemetry(AlertsScheduler)
    telemetry.collect_telemetry(DataIngestionBackend)
