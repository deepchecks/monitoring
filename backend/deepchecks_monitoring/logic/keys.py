# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module to define keys for kafka and redis."""
from typing import Tuple

MODEL_VERSIONS_QUEUE_KEY = "model-version-worker:queue"
MODEL_VERSIONS_SORTED_SET_KEY = "model-version-worker:process-time"
DATA_TOPIC_PREFIX = "data"
INVALIDATION_TOPIC_PREFIX = "invalidation"


def get_data_topic_name(organization_id, model_version_id) -> str:
    """Get name of kafka topic for data messages.

    Returns
    -------
    str
        Name of kafka topic to be used for given model version entity.
    """
    return f"{DATA_TOPIC_PREFIX}-{organization_id}-{model_version_id}"


def topic_name_to_ids(topic_name: str) -> Tuple[int, int]:
    """Get data topic name and return organization id and model version id."""
    split = topic_name.split("-")
    if len(split) != 3 or split[0] not in [DATA_TOPIC_PREFIX, INVALIDATION_TOPIC_PREFIX]:
        raise Exception(f"Got unexpected topic name: {topic_name}")

    return int(split[1]), int(split[2])


def get_invalidation_topic_name(organization_id, model_version_id) -> str:
    """Get name of kafka topic for invalidation messages.

    Returns
    -------
    str
        Name of the data topic to be used for invalidation topic name.
    """
    return f"{INVALIDATION_TOPIC_PREFIX}-{organization_id}-{model_version_id}"
