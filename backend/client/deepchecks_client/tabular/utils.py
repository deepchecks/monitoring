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
"""Module containing deepchecks monitoring client."""
import io
import warnings

import pandas as pd
import yaml
from deepchecks.tabular import Dataset
from deepchecks_client.core.utils import ColumnType, pretty_print
from pandas.core.dtypes.common import (is_bool_dtype, is_categorical_dtype, is_integer_dtype, is_numeric_dtype,
                                       is_string_dtype)

__all__ = ['create_schema', 'read_schema']


def _get_series_column_type(series: pd.Series):
    if series.dtype == 'object':
        # object might still be only floats, so we rest the dtype
        series = pd.Series(series.to_list())
    if is_bool_dtype(series):
        return ColumnType.BOOLEAN.value
    if is_integer_dtype(series):
        return ColumnType.INTEGER.value
    if is_numeric_dtype(series):
        return ColumnType.NUMERIC.value
    if is_categorical_dtype(series):
        return ColumnType.CATEGORICAL.value
    if is_string_dtype(series) and series.dtype != 'object':
        return ColumnType.TEXT.value
    warnings.warn(f"Received unsupported dtype: {series.dtype}."
                  "Supported dtypes for auto infer are numerical, integer, boolean, string and categorical.")
    return None


def create_schema(dataset: Dataset, schema_output_file='schema.yaml'):
    """Automatically infer schema and saves it to yaml.

    Parameters
    ----------
    dataset: deepchecks.tabular.Dataset
        the dataset to infer its schema
    schema_output_file: , default: 'schema.yaml'
        file like object or path in which the generated schema will be saved into
    """
    non_features = {}
    features = {}
    for column in dataset.data.columns:
        col_series = dataset.data[column]
        if column in [dataset.index_name, dataset.datetime_name]:
            continue
        elif dataset.has_label() and column == dataset.label_name:
            continue
        elif column in dataset.features:
            if column in dataset.cat_features:
                features[column] = ColumnType.BOOLEAN.value if is_bool_dtype(
                    col_series) else ColumnType.CATEGORICAL.value
            elif column in dataset.numerical_features:
                features[column] = ColumnType.INTEGER.value if is_integer_dtype(
                    col_series) else ColumnType.NUMERIC.value
            else:
                features[column] = _get_series_column_type(col_series)
                if features[column] == ColumnType.CATEGORICAL.value:
                    features[column] = ColumnType.TEXT.value
        else:
            non_features[column] = _get_series_column_type(col_series)
    yaml_schema = io.StringIO()
    yaml.dump({'features': features, 'non_features': non_features}, yaml_schema)
    yaml_schema_val = yaml_schema.getvalue()
    yaml_schema.close()

    # a bit of ugly code to write the content at the start
    yaml_schema = io.StringIO()
    yaml_schema.write('# Automatically inferred schema.\n'
                      '# Some inferred types may be incorrect, please check carefully as it cannot be changed.\n'
                      '# Possible values are: "numeric", "integer", "categorical", '
                      '"boolean", "text", "array_float", "array_float_2d".\n'
                      '# Please note that "integer" type cannot receive float types, '
                      'so if it may be needed in the future change the type to "numeric".\n'
                      '# None values are inserted if we failed to infer, please update the values manually.\n')
    yaml_schema.write(yaml_schema_val)

    if isinstance(schema_output_file, str):
        with open(schema_output_file, 'w', encoding='utf-8') as f:
            f.write(yaml_schema.getvalue())
    elif isinstance(schema_output_file, io.IOBase):
        schema_output_file.write(yaml_schema.getvalue())
    else:
        raise TypeError(f'Unsupported type of "schema_file" parameter - {type(schema_output_file)}')
    pretty_print(f'Schema was successfully generated and saved to {schema_output_file}.')


def read_schema(schema_file):
    """Convert schema file created by `create_schema` to features and non_features dict.

    Parameters
    ----------
    schema_file
        file like object or path

    Returns
    -------
    dict
        dictionary in format {'features': <features>, 'non_features': <non_features>}
    """
    if isinstance(schema_file, str):
        with open(schema_file, 'r') as f:
            schema = yaml.safe_load(f.read())
    elif isinstance(schema_file, io.IOBase):
        schema_file.seek(0)
        schema = yaml.safe_load(schema_file)
    else:
        raise TypeError(f'Unsupported type of "schema_file" parameter - {type(schema_file)}')

    if not isinstance(schema, dict) or list(schema.keys()) != ['features', 'non_features']:
        raise ValueError('Wrong schema format. Schema must contain 2 dictionaries for features and non_features.')
    for key, val in schema['features'].items():
        if val not in ColumnType.values():
            raise TypeError(f'Unsupported column type {val} for feature {key}')
    for key, val in schema['non_features'].items():
        if val not in ColumnType.values():
            raise TypeError(f'Unsupported column type {val} for non feature {key}')

    return schema
