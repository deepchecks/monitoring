# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import logging

from deepchecks_monitoring.bgtasks.model_version_worker import ModelVersionWorker


async def run_worker(resources_provider):
    worker = ModelVersionWorker(resources_provider, logging.getLogger(), process_interval_seconds=0)
    await worker.move_single_item_set_to_queue()
    await worker.calculate_single_item_in_queue(timeout=10)

