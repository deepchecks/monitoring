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
import enum
import typing as t

from sqlalchemy import ARRAY, Boolean, Column, DateTime, Float, Text

from deepchecks_monitoring.models import TaskType

SAMPLE_ID_COL = "_dc_sample_id"
SAMPLE_TS_COL = "_dc_time"
SAMPLE_LABEL_COL = "_dc_label"
SAMPLE_PRED_VALUE_COL = "_dc_prediction_value"
SAMPLE_PRED_LABEL_COL = "_dc_prediction_label"


__all__ = ["SAMPLE_ID_COL", "SAMPLE_TS_COL", "SAMPLE_LABEL_COL", "SAMPLE_PRED_LABEL_COL", "SAMPLE_PRED_VALUE_COL",
           "get_model_columns_by_type", "column_types_to_table_columns", "ColumnType"]


class ColumnType(enum.Enum):
    """Enum containing possible types of data."""

    NUMERIC = "numeric"
    CATEGORICAL = "categorical"
    BOOLEAN = "boolean"
    TEXT = "text"
    ARRAY_FLOAT = "array_float"
    DATETIME = "datetime"

    def to_sqlalchemy_type(self):
        """Return the SQLAlchemy type of the data type."""
        types_map = {
            ColumnType.NUMERIC: Float,
            ColumnType.CATEGORICAL: Text,
            ColumnType.BOOLEAN: Boolean,
            ColumnType.TEXT: Text,
            ColumnType.ARRAY_FLOAT: ARRAY(Float),
            ColumnType.DATETIME: DateTime(timezone=True)
        }
        return types_map[self]

    def to_json_schema_type(self, nullable=False):
        """Return the json type of the column type."""
        types_map = {
            ColumnType.NUMERIC: {"type": "number"},
            ColumnType.CATEGORICAL: {"type": "string"},
            ColumnType.BOOLEAN: {"type": "boolean"},
            ColumnType.TEXT: {"type": "string"},
            ColumnType.ARRAY_FLOAT: {"type": "array", "items": {"type": "number"}},
            ColumnType.DATETIME: {"type": "string", "format": "datetime"}
        }
        schema = types_map[self]
        if nullable:
            schema["type"] = (schema["type"], "null")
        return schema

    def to_statistics_stub(self):
        """Generate an empty statistics dict for given column type."""
        types_map = {
            ColumnType.NUMERIC: {"min": None, "max": None},
            ColumnType.CATEGORICAL: {"values": []},
            ColumnType.BOOLEAN: {"values": []},
            ColumnType.TEXT: None,
            ColumnType.ARRAY_FLOAT: None,
            ColumnType.DATETIME: None
        }
        return types_map[self]


def get_model_columns_by_type(task_type: TaskType) -> t.Tuple[t.Dict[str, ColumnType], t.List]:
    """Get deepchecks' saved columns to be used in json schema based on given task type.

    Parameters
    ----------
    task_type

    Returns
    -------
    Tuple[Dict, List]
        Columns for the json schema, and list of required columns
    """
    if task_type == TaskType.REGRESSION:
        return {
            SAMPLE_LABEL_COL: ColumnType.NUMERIC,
            SAMPLE_PRED_VALUE_COL: ColumnType.NUMERIC
        }, [SAMPLE_PRED_VALUE_COL]
    elif task_type == TaskType.CLASSIFICATION:
        return {
            SAMPLE_LABEL_COL: ColumnType.CATEGORICAL,
            SAMPLE_PRED_LABEL_COL: ColumnType.CATEGORICAL,
            SAMPLE_PRED_VALUE_COL: ColumnType.ARRAY_FLOAT
        }, [SAMPLE_PRED_LABEL_COL]
    else:
        raise Exception(f"Not supported task type {task_type}")


def column_types_to_table_columns(column_types: t.Dict[str, ColumnType], primary_key=SAMPLE_ID_COL) -> t.List[Column]:
    """Get sqlalchemy columns from columns types sent from the user (out of ColumnDataType).

    All columns also have index defined on them for faster querying

    Parameters
    ----------
    column_types
    primary_key

    Returns
    -------
    List[sqlalchemy.Column]
    """
    return [Column(name, data_type.to_sqlalchemy_type(), index=True, primary_key=(name == primary_key))
            for name, data_type in column_types.items()]
