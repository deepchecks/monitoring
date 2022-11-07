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
import pathlib
import typing as t
import warnings

import pandas as pd
import yaml
from deepchecks.tabular import Dataset
from deepchecks.tabular.utils.feature_inference import is_categorical
from deepchecks_client.core.utils import ColumnType, pretty_print
from pandas.core.dtypes.common import is_bool_dtype, is_categorical_dtype, is_integer_dtype, is_numeric_dtype

__all__ = ['create_schema', 'read_schema']


def _get_series_column_type(series: pd.Series):
    if series.dtype == 'object':
        # object might still be only of one type, so we re-infer the dtype
        series = pd.Series(series.to_list(), name=series.name)
    if is_bool_dtype(series):
        return ColumnType.BOOLEAN.value
    if is_integer_dtype(series):
        return ColumnType.INTEGER.value
    if is_numeric_dtype(series):
        return ColumnType.NUMERIC.value
    if is_categorical_dtype(series):
        return ColumnType.CATEGORICAL.value
    if series.apply(type).eq(str).all():
        if is_categorical(series):
            return ColumnType.CATEGORICAL.value
        return ColumnType.TEXT.value
    warnings.warn(f'Column {series.name} is of unsupported dtype - {series.dtype}.')
    return None


DataSchema = t.Dict[str, t.Dict[str, str]]  # TODO: rename


def describe_dataset(dataset: Dataset) -> DataSchema:
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
    # if any columns failed to auto infer print this warnings
    # moved to here to not annoy the user so much
    if pd.Series(features.values()).hasnans or pd.Series(non_features.values()).hasnans:
        warnings.warn('Supported dtypes for auto infer are numerical, integer, boolean, string and categorical.\n'
                      'You can set the type manually in the schema file/dict.\n'
                      'DateTime format is supported using iso format only.')
    return {'features': features, 'non_features': non_features}


def create_schema(dataset: Dataset, schema_output_file='schema.yaml'):
    """Automatically infer schema and saves it to yaml.

    Parameters
    ----------
    dataset: deepchecks.tabular.Dataset
        the dataset to infer its schema
    schema_output_file: , default: 'schema.yaml'
        file like object or path in which the generated schema will be saved into
    """
    schema = describe_dataset(dataset)
    yaml_schema = io.StringIO()
    yaml.dump(schema, yaml_schema)
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


def read_schema(schema: t.Union[str, pathlib.Path, io.TextIOBase, DataSchema]) -> DataSchema:
    """Read and validate model schema.

    Parameters
    ----------
    schema : Union[str, pathlib.Path, io.TextIOBase, Dict[str, Dict[str, Any]]]
        path to a schema file, file like object with schema,
        or a dictionary representing a schema

    Returns
    -------
    Dict[str, Dict[str, Any]]
        dictionary in format
        {
            "features": {"<feature-name>": "<column-type>"},
            "non_features": {"<feature-name>": "<column-type>"}
        }
    """
    if isinstance(schema, str):
        schema = pathlib.Path(schema)

    if isinstance(schema, pathlib.Path):
        if not schema.exists():
            raise ValueError(f'Provided schema file does not exist - {schema}')
        if not schema.is_file():
            raise ValueError(f'Provided schema is not a file - {schema}')
        with schema.open('r', encoding='utf-8') as f:
            schema = t.cast(DataSchema, yaml.safe_load(f.read()))
    elif isinstance(schema, io.TextIOBase):
        schema.seek(0)
        schema = t.cast(DataSchema, yaml.safe_load(schema))
    elif isinstance(schema, dict):
        pass  # validate its correctness below
    else:
        raise TypeError(f'Unsupported type of "schema" parameter - {type(schema)}')

    if set(schema.keys()) != {'features', 'non_features'}:
        raise ValueError('Wrong schema format. Schema must contain 2 dictionaries for features and non_features.')

    allowed_column_types = set(ColumnType.values())
    features = schema['features']
    non_features = schema['non_features']

    if not isinstance(features, dict):
        raise ValueError('Wrong schema format, "features" key expected to be a dictionary')
    if not isinstance(non_features, dict):
        raise ValueError('Wrong schema format, "non_features" key expected to be a dictionary')

    for key, val in schema['features'].items():
        if val not in allowed_column_types:
            raise TypeError(f'Unsupported column type {val} for feature {key}')

    for key, val in schema['non_features'].items():
        if val not in allowed_column_types:
            raise TypeError(f'Unsupported column type {val} for non feature {key}')

    return schema
