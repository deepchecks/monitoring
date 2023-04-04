# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the column types in we support in db for the data ingestion."""
import enum
import typing as t

import sqlalchemy as sa

from deepchecks_monitoring.schema_models.task_type import TaskType

__all__ = [
    "SAMPLE_ID_COL", "SAMPLE_TS_COL",
    "SAMPLE_LABEL_COL", "SAMPLE_PRED_PROBA_COL",
    "SAMPLE_PRED_COL", "SAMPLE_LOGGED_TIME_COL",
    "REFERENCE_SAMPLE_ID_COL", "ColumnType",
    "get_predictions_columns_by_type", "column_types_to_table_columns",
    "get_label_column_type"
]


SAMPLE_ID_COL = "_dc_sample_id"
REFERENCE_SAMPLE_ID_COL = "_dc_ref_sample_id"
SAMPLE_TS_COL = "_dc_time"
SAMPLE_LABEL_COL = "_dc_label"
SAMPLE_PRED_PROBA_COL = "_dc_prediction_probabilities"
SAMPLE_PRED_COL = "_dc_prediction"
SAMPLE_LOGGED_TIME_COL = "_dc_logged_time"


class ColumnType(str, enum.Enum):
    """Enum containing possible types of data."""

    NUMERIC = "numeric"
    INTEGER = "integer"
    BIGINT = "bigint"
    CATEGORICAL = "categorical"
    BOOLEAN = "boolean"
    TEXT = "text"
    ARRAY_FLOAT = "array_float"
    ARRAY_FLOAT_2D = "array_float_2d"
    DATETIME = "datetime"

    def to_sqlalchemy_type(self):
        """Return the SQLAlchemy type of the data type."""
        types_map = {
            ColumnType.NUMERIC: sa.Float,
            ColumnType.INTEGER: sa.Integer,
            ColumnType.BIGINT: sa.BigInteger,
            ColumnType.CATEGORICAL: sa.Text,
            ColumnType.BOOLEAN: sa.Boolean,
            ColumnType.TEXT: sa.Text,
            ColumnType.ARRAY_FLOAT: sa.ARRAY(sa.Float),
            ColumnType.ARRAY_FLOAT_2D: sa.ARRAY(sa.Float),
            ColumnType.DATETIME: sa.DateTime(timezone=True)
        }
        return types_map[self]

    def to_json_schema_type(self, nullable=False, min_items: int = None, max_items: int = None):
        """Return the json type of the column type."""
        types_map = {
            ColumnType.NUMERIC: {"type": "number"},
            ColumnType.INTEGER: {"type": "integer", "maximum": 2147483647, "minimum": -2147483648},
            ColumnType.BIGINT: {"type": "integer", "maximum": 9223372036854775807, "minimum": -9223372036854775808},
            ColumnType.CATEGORICAL: {"type": "string"},
            ColumnType.BOOLEAN: {"type": "boolean"},
            ColumnType.TEXT: {"type": "string"},
            ColumnType.ARRAY_FLOAT: {"type": "array", "items": {"type": "number"}},
            ColumnType.ARRAY_FLOAT_2D: {"type": "array", "items": {"type": "array", "items": {"type": "number"}}},
            ColumnType.DATETIME: {"type": "string", "format": "date-time"}
        }
        schema = types_map[self]
        if nullable:
            schema["type"] = [schema["type"], "null"]
        if min_items and self == ColumnType.ARRAY_FLOAT:
            schema["minItems"] = min_items
        if max_items and self == ColumnType.ARRAY_FLOAT:
            schema["maxItems"] = max_items
        return schema

    def to_statistics_stub(self):
        """Generate an empty statistics dict for given column type."""
        types_map = {
            ColumnType.NUMERIC: {"min": None, "max": None},
            ColumnType.INTEGER: {"min": None, "max": None},
            ColumnType.BIGINT: {"min": None, "max": None},
            ColumnType.CATEGORICAL: {"values": []},
            ColumnType.BOOLEAN: {"values": []},
            ColumnType.TEXT: None,
            ColumnType.ARRAY_FLOAT: None,
            ColumnType.ARRAY_FLOAT_2D: None,
            ColumnType.DATETIME: {"min": None, "max": None},
        }
        return types_map[self]


def get_predictions_columns_by_type(task_type: "TaskType", have_classes: bool) \
        -> t.Tuple[t.Dict[str, ColumnType], t.List]:
    """Get deepchecks' saved columns to be used in json schema based on given task type.

    Parameters
    ----------
    task_type
    have_classes

    Returns
    -------
    Tuple[Dict, List]
        Columns for the json schema, and list of required columns
    """
    if task_type == TaskType.REGRESSION:
        return {
            SAMPLE_PRED_COL: ColumnType.NUMERIC
        }, [SAMPLE_PRED_COL]
    elif task_type in [TaskType.BINARY, TaskType.MULTICLASS]:
        if have_classes:
            return {
                SAMPLE_PRED_COL: ColumnType.CATEGORICAL,
                SAMPLE_PRED_PROBA_COL: ColumnType.ARRAY_FLOAT
            }, [SAMPLE_PRED_COL]
        else:
            return {
                SAMPLE_PRED_COL: ColumnType.CATEGORICAL,
            }, [SAMPLE_PRED_COL]
    else:
        raise Exception(f"Not supported task type {task_type}")


def get_label_column_type(task_type: "TaskType") -> ColumnType:
    """Get column type for label on given task type.

    Parameters
    ----------
    task_type

    Returns
    -------
    ColumnType
    """
    if task_type == TaskType.REGRESSION:
        return ColumnType.NUMERIC
    elif task_type in [TaskType.BINARY, TaskType.MULTICLASS]:
        return ColumnType.CATEGORICAL
    else:
        raise Exception(f"Not supported task type {task_type}")


def column_types_to_table_columns(column_types: t.Dict[str, ColumnType], primary_key=SAMPLE_ID_COL) \
        -> t.List[sa.Column]:
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
    return [
        sa.Column(
            name,
            data_type.to_sqlalchemy_type(),
            index=True,
            primary_key=(name == primary_key)
        )
        for name, data_type in column_types.items()
    ]
