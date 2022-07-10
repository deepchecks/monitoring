# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the dynamic tables metadata for the monitoring package."""
import typing as t

from sqlalchemy import ARRAY, Column, DateTime, Float, String

from deepchecks_monitoring.models import ColumnDataType
from deepchecks_monitoring.models.model import TaskType


def get_monitor_table_meta_columns() -> t.List[Column]:
    """Get the columns for the data table.

    Returns
    -------
    List[Column]
        list of meta-columns
    """
    return [
        Column('_dc_sample_id', String(30), primary_key=True),
        Column('_dc_time', DateTime(timezone=True), index=True),
    ]


def get_task_related_table_columns(task_type: TaskType) -> t.List[Column]:
    """Get the columns for the data table based on the task type.

    Parameters
    ----------
    task_type : TaskType
        The task type. Currently one of `TaskType.REGRESSION` or `TaskType.CLASSIFICATION`.

    Returns
    -------
    List[Column]
        list of meta-columns
    """
    if task_type == TaskType.REGRESSION:
        return [
            Column('_dc_label', Float, index=True),
            Column('_dc_prediction_value', Float, index=True)
        ]
    elif task_type == TaskType.CLASSIFICATION:
        return [
            Column('_dc_label', String, index=True),
            Column('_dc_prediction_label', String, index=True),
            Column('_dc_prediction_value', ARRAY(Float), index=True)
        ]
    else:
        raise Exception(f'Not supported task type {task_type}')


def column_types_to_table_columns(column_types: t.Dict[str, ColumnDataType]) -> t.List[Column]:
    """Get sqlalchemy columns from columns types sent from the user (out of ColumnDataType).

    All columns also have index defined on them for faster querying

    Parameters
    ----------
    column_types

    Returns
    -------
    List[sqlalchemy.Column]
    """
    return [Column(name, data_type.to_sqlalchemy_type(), index=True) for name, data_type in column_types.items()]
