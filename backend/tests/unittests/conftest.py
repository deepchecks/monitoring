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
from datetime import datetime, timedelta, timezone

import pytest
import sqlalchemy as sa

from deepchecks_monitoring.schema_models.model_version import ModelVersion


@pytest.fixture(scope="package", autouse=True)
def _():
    # adding telemetry to make sure that it does not break routines
    from deepchecks_monitoring.bgtasks.core import Worker
    from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler
    from deepchecks_monitoring.bgtasks.telemetry import collect_telemetry
    collect_telemetry(Worker)
    collect_telemetry(AlertsScheduler)


async def update_model_version_end(
    async_engine,
    classification_model_version_id,
    organization,
    end_time=None
):
    now = datetime.now(timezone.utc)

    if end_time is None:
        end_time = now + timedelta(days=1)

    async with async_engine.connect() as c:
        await c.execute(
            sa.update(ModelVersion)
            .where(ModelVersion.id == classification_model_version_id)
            .values({ModelVersion.start_time: end_time - timedelta(days=1), ModelVersion.end_time: end_time})
            .execution_options(schema_translate_map={None: organization.schema_name})
        )
        await c.commit()

