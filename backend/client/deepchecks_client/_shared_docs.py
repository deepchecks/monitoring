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
"""Shared documentation strings."""
from deepchecks.utils.decorators import Substitution

__all__ = ['docstrings']

_shared_docstrings = {}

_shared_docstrings['add_monitor_desc'] = """
Create a new monitor to be displayed in the dashboard.

A monitor runs a selected check on data over time and displays the check's result values.
""".strip('\n')

_shared_docstrings['add_monitor_params'] = """
check_name: str
    The check to monitor. The alert will monitor the value produced
    by the check's reduce function.
frequency: int
    How often the minitor would be calculated, provided in seconds.
aggregation_window: int, default: None
    The aggregation window of each calculation of the monitor, provided in seconds. If None, the aggregation window
    will be the same as the frequency.
lookback: int, default: None
    Determines the time range for which the monitor is run, provided in seconds. If None, the lookback will be
    inferred based on the frequency.
name: str, default: None
    The name to assign to the monitor.
description: str, default: None
    The description to assigned to the monitor.
add_to_dashboard: bool, default: True
    Whether to add the monitor to the dashboard screen.
kwargs_for_check: t.Dict, default = None
    Additional kwargs to pass on to check.
""".strip('\n')

_shared_docstrings['add_alert_rule_desc'] = """
Create a new alert rule for provided model based on selected check.

The alert will run the selected check on data in defined time intervals and verify if the check return value meets the
defined condition.
""".strip('\n')

_shared_docstrings['add_alert_rule_params'] = """
check_name: str
    The check to monitor. The alert will monitor the value produced by the check's reduce function.
threshold: float
    The value to compare the check value to.
frequency: int, default: None
    Control the frequency the alert will be calculated, provided in seconds.
aggregation_window: int
    The aggregation window of each calculation of the alert, provided in seconds. If None, the aggregation window
    will be the same as the frequency.
alert_severity: str, default: "mid"
    The severity level associated with the alert. Possible values are: critical, high, mid and low.
greater_than: bool, default: True
    Whether the alert condition requires the check value to be larger or smaller than provided threshold.
kwargs_for_check: t.Dict, default = None
    Additional kwargs to pass on to check.
monitor_name: str, default: None
    Name for the created monitor.
add_monitor_to_dashboard: bool, default: False
    Whether to add a corresponding monitor to the dashboard screen.
""".strip('\n')

_shared_docstrings['schema_param'] = """
schema : Union[str, pathlib.Path, io.TextIOBase, Dict[str, Dict[str, Any]]]
    path to a schema file, file like object with schema,
    or a dictionary representing a schema.
    This method expects that provided file will be in the next yaml format:
        features:
            foo: <feature-type>
            bar: <feature-type>
        additional_data:
            foo: <feature-type>
            bar: <feature-type>
    where 'feature-type' is one of:
            - 'numeric'
            - 'integer'
            - 'categorical'
            - 'boolean'
            - 'text'
            - 'array_float'
            - 'array_float_2d'
            - 'datetime'
""".strip('\n')

_shared_docstrings['schema_param_none'] = """
schema : Union[str, pathlib.Path, io.TextIOBase, Dict[str, Dict[str, Any]]], default: None
    path to a schema file, file like object with schema,
    or a dictionary representing a schema. Can be none if getting existing model version.
    This method expects that provided file will be in the next yaml format:
        features:
            foo: <feature-type>
            bar: <feature-type>
        additional_data:
            foo: <feature-type>
            bar: <feature-type>
    where 'feature-type' is one of:
            - 'numeric'
            - 'integer'
            - 'categorical'
            - 'boolean'
            - 'text'
            - 'array_float'
            - 'array_float_2d'
            - 'datetime'
""".strip('\n')

docstrings = Substitution(**_shared_docstrings)
