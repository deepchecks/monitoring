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
import typing as t

import pendulum as pdl

# Mapping entity to prefix in kafka topic name
DATA_TOPIC_PREFIXES = {
    "model-version": "data",
    "model": "modelData",
}
reverse_data_topic_prefixes = {v: k for k, v in DATA_TOPIC_PREFIXES.items()}
GLOBAL_TASK_QUEUE = "task_queue"
INVALIDATION_SET_PREFIX = "invalidation"


def get_data_topic_name(organization_id, entity_id, entity: t.Literal["model", "model-version"]) -> str:
    """Get name of kafka topic for data messages.

    Returns
    -------
    str
        Name of kafka topic to be used for given entity.
    """
    if entity not in DATA_TOPIC_PREFIXES:
        raise Exception(f"Got unexpected entity: {entity}")
    return f"{DATA_TOPIC_PREFIXES[entity]}-{organization_id}-{entity_id}"


def data_topic_name_to_ids(topic_name: str) -> t.Tuple[int, int, str]:
    """Get data topic name and return organization id, entity id, and entity type."""
    split = topic_name.split("-")
    if len(split) != 3 or split[0] not in reverse_data_topic_prefixes:
        raise Exception(f"Got unexpected topic name: {topic_name}")

    return int(split[1]), int(split[2]), reverse_data_topic_prefixes[split[0]]


def get_invalidation_set_key(organization_id, model_version_id) -> str:
    """Get name of redis key for invalidation timestamps.

    Returns
    -------
    str
        key to be used for invalidation timestamps.
    """
    return f"{INVALIDATION_SET_PREFIX}:{organization_id}:{model_version_id}"


def build_monitor_cache_key(
        organization_id: t.Optional[int],
        model_version_id: t.Optional[int],
        monitor_id: t.Optional[int],
        start_time: t.Optional[pdl.DateTime],
        end_time: t.Optional[pdl.DateTime]) -> str:
    """Build key for the cache using the given parameters.

    Parameters
    ----------
    organization_id: t.Optional[int]
    model_version_id: t.Optional[int]
    monitor_id: t.Optional[int]
    start_time: t.Optional[pdl.DateTime]
    end_time: t.Optional[pdl.DateTime]

    Returns
    -------
    str
    """
    end_time = str(end_time.int_timestamp) if isinstance(end_time, pdl.DateTime) else "*"
    start_time = str(start_time.int_timestamp) if isinstance(start_time, pdl.DateTime) else "*"
    organization_id = organization_id if isinstance(organization_id, int) else "*"
    model_version_id = model_version_id if isinstance(model_version_id, int) else "*"
    monitor_id = monitor_id if isinstance(monitor_id, int) else "*"
    return f"mon_cache:{organization_id}:{model_version_id}:{monitor_id}:{start_time}:{end_time}"
