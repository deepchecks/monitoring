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

from deepchecks_monitoring.models import ColumnType, TaskType

SAMPLE_ID_COL = "_dc_sample_id"
SAMPLE_TS_COL = "_dc_time"
SAMPLE_LABEL_COL = "_dc_label"
SAMPLE_PRED_VALUE_COL = "_dc_prediction_value"
SAMPLE_PRED_LABEL_COL = "_dc_prediction_label"


__all__ = ["get_json_schema_columns_for_monitor", "get_json_schema_columns_for_model", "get_table_columns_for_model",
           "get_table_columns_for_monitor", "column_types_to_table_columns", "SAMPLE_ID_COL", "SAMPLE_TS_COL"]


def get_table_columns_for_monitor() -> t.List[Column]:
    """Get the columns for the data table.

    Returns
    -------
    List[Column]
        list of meta-columns
    """
    return [
        Column(SAMPLE_ID_COL, String(30), primary_key=True),
        Column(SAMPLE_TS_COL, DateTime(timezone=True), index=True),
    ]


def get_table_columns_for_model(task_type: TaskType) -> t.List[Column]:
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
            Column(SAMPLE_LABEL_COL, Float, index=True),
            Column(SAMPLE_PRED_VALUE_COL, Float, index=True)
        ]
    elif task_type == TaskType.CLASSIFICATION:
        return [
            Column(SAMPLE_LABEL_COL, String, index=True),
            Column(SAMPLE_PRED_LABEL_COL, String, index=True),
            Column(SAMPLE_PRED_VALUE_COL, ARRAY(Float), index=True)
        ]
    else:
        raise Exception(f"Not supported task type {task_type}")


def get_json_schema_columns_for_model(task_type: TaskType) -> t.Dict:
    """Get deepchecks' saved columns to be used in json schema for a model based on given task type.

    Parameters
    ----------
    task_type

    Returns
    -------
    Dict
        Items to be inserted into json schema
    """
    if task_type == TaskType.REGRESSION:
        return {
            SAMPLE_LABEL_COL: {"type": "number"},
            SAMPLE_PRED_VALUE_COL: {"type": "number"}
        }
    elif task_type == TaskType.CLASSIFICATION:
        return {
            SAMPLE_LABEL_COL: {"type": "string"},
            SAMPLE_PRED_LABEL_COL: {"type": "string"},
            SAMPLE_PRED_VALUE_COL: {"type": "array", "items": {"type": "number"}}
        }
    else:
        raise Exception(f"Not supported task type {task_type}")


def get_json_schema_columns_for_monitor() -> t.Dict:
    """Get deepchecks' saved columns to be used in json schema for monitoring table.

    Returns
    -------
    Dict
    """
    return {
        SAMPLE_ID_COL: {"type": "string"},
        SAMPLE_TS_COL: {"type": "string", "format": "datetime"}
    }


def column_types_to_table_columns(column_types: t.Dict[str, ColumnType]) -> t.List[Column]:
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
