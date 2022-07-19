# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module containing deepchecks monitoring client."""
import enum
from datetime import datetime
from typing import Dict, Union

import numpy as np
import pendulum as pdl
import requests
from deepchecks import Dataset
from jsonschema import validate

__all__ = ['DeepchecksClient']


class TaskType(enum.Enum):
    """Enum containing supported task types."""

    REGRESSION = "regression"
    CLASSIFICATION = "classification"

    @classmethod
    def values(cls):
        return [e.value for e in TaskType]


class ColumnType(enum.Enum):
    """Enum containing possible types of data."""

    NUMERIC = "numeric"
    CATEGORICAL = "categorical"
    BOOLEAN = "boolean"
    TEXT = "text"

    @classmethod
    def values(cls):
        return [e.value for e in ColumnType]


class DeepchecksColumns(enum.Enum):
    """Enum of saved deepchecks columns."""

    SAMPLE_ID_COL = "_dc_sample_id"
    SAMPLE_TS_COL = "_dc_time"
    SAMPLE_LABEL_COL = "_dc_label"
    SAMPLE_PRED_VALUE_COL = "_dc_prediction_value"
    SAMPLE_PRED_LABEL_COL = "_dc_prediction_label"


class DeepchecksModelVersionClient:
    """Client to interact with a given model version, including all functions to send data.

    Parameters
    ----------
    host: str
        The deepchecks monitoring API host.
    model_version_id: int
        The id of the model version.
    """

    host: str
    model_version_id: int
    schema: dict
    ref_schema: dict

    def __init__(self, host: str, model_version_id: int):
        self.host = host
        self.model_version_id = model_version_id
        response = requests.get(f'{host}/model_version/{model_version_id}/schema')
        response.raise_for_status()
        self.schema = response.json()
        response = requests.get(f'{host}/model_version/{model_version_id}/reference_schema')
        response.raise_for_status()
        self.ref_schema = response.json()

    def log_sample(self,
                   sample_id: str,
                   timestamp: Union[datetime, int] = None,
                   prediction_value=None,
                   prediction_label=None,
                   **values):
        """Send sample for the model version.

        Parameters
        ----------
        sample_id: str
        timestamp: Union[datetime, int]
            If no timezone info is provided on the datetime assumes local timezone.
        prediction_value
            Prediction value if exists
        prediction_label
            Prediction label if exists
        values
            All features of the sample and optional non_features
        """
        if timestamp:
            if isinstance(timestamp, int):
                timestamp = pdl.from_timestamp(timestamp, pdl.local_timezone())
            elif isinstance(timestamp, datetime):
                # If no timezone in datetime, assumed to be UTC and converted to local timezone
                timestamp = pdl.instance(timestamp, pdl.local_timezone())
            else:
                raise Exception(f'Not supported timestamp type: {type(timestamp)}')
        else:
            timestamp = pdl.now()

        sample = {
            DeepchecksColumns.SAMPLE_ID_COL.value: sample_id,
            DeepchecksColumns.SAMPLE_TS_COL.value: timestamp.to_iso8601_string(),
            **values
        }

        if prediction_value:
            sample[DeepchecksColumns.SAMPLE_PRED_VALUE_COL.value] = prediction_value
        if prediction_label:
            sample[DeepchecksColumns.SAMPLE_PRED_LABEL_COL.value] = prediction_label

        validate(instance=sample, schema=self.schema)

        response = requests.post(f'{self.host}/data/{self.model_version_id}/log', json=sample)
        response.raise_for_status()

    def upload_reference(self,
                         dataset: Dataset,
                         prediction_value: np.ndarray = None,
                         prediction_label: np.ndarray = None):
        """Upload reference data. Possible to upload only once for a given model version.

        Parameters
        ----------
        dataset: deepchecks.tabular.Dataset
        prediction_value: np.ndarray
        prediction_label: np.ndarray
        """
        if len(dataset) > 100_000:
            raise Exception('Maximum size allowed for reference data is 100,000')

        data = dataset.features_columns.copy()
        if dataset.label_name:
            data[DeepchecksColumns.SAMPLE_LABEL_COL.value] = dataset.label_col
        if prediction_value:
            data[DeepchecksColumns.SAMPLE_PRED_VALUE_COL.value] = prediction_value
        if prediction_label:
            data[DeepchecksColumns.SAMPLE_PRED_LABEL_COL.value] = prediction_label

        for (_, row) in data.iterrows():
            item = row.to_dict()
            validate(schema=self.ref_schema, instance=item)

        response = requests.post(f'{self.host}/data/{self.model_version_id}/reference',
                                 files={'file': data.to_json(orient='table', index=False)})
        response.raise_for_status()

    def update_sample(self, sample_id: str, label=None, **values):
        """Update sample. Possible to update only non_features and label.

        Parameters
        ----------
        sample_id: str
        label
        values
        """
        # Create update schema, which contains only non-required columns and sample id
        required_columns = set(self.schema["required"])
        optional_columns_schema = {
            "type": "object",
            "properties": {k: v for k, v in self.schema["properties"].items()
                           if k not in required_columns or k == DeepchecksColumns.SAMPLE_ID_COL.value},
            "required": [DeepchecksColumns.SAMPLE_ID_COL.value]
        }

        update = {DeepchecksColumns.SAMPLE_ID_COL.value: sample_id, **values}

        if label:
            update[DeepchecksColumns.SAMPLE_LABEL_COL.value] = label

        validate(instance=update, schema=optional_columns_schema)
        response = requests.post(f'{self.host}/data/{self.model_version_id}/update', json=update)
        response.raise_for_status()


class DeepchecksModelClient:
    """Client to interact with a model in monitoring.

    Parameters
    ----------
    host: str
        The deepchecks monitoring API host.
    model_id: int
        The id of the model.
    """

    host: str
    model: dict

    def __init__(self, host: str, model_id: int):
        self.host = host
        response = requests.get(f'{self.host}/models/{model_id}')
        response.raise_for_status()
        self.model = response.json()

    def create_version(self,
                       name: str,
                       features: Dict[str, str],
                       non_features: Dict[str, str] = None,
                       feature_importance: Dict[str, float] = None) -> DeepchecksModelVersionClient:
        """Create a new model version.

        Parameters
        ----------
        name: str
            Name to display for new version
        features: dict
        non_features: dict
        feature_importance: dict

        Returns
        -------
        DeepchecksModelVersionClient
            Client to interact with the newly created version.
        """
        # Start with validation
        if not isinstance(features, dict):
            raise Exception('features must be a dict')
        for key, value in features.items():
            if not isinstance(key, str):
                raise Exception(f'key of features must be of type str but got: {type(key)}')
            if value not in ColumnType.values():
                raise Exception(f'value of features must be one of {ColumnType.values()} but got {value}')

        if feature_importance:
            if not isinstance(feature_importance, dict):
                raise Exception('feature_importance must be a dict')
            symmetric_diff = set(feature_importance.keys()).symmetric_difference(features.keys())
            if symmetric_diff:
                raise Exception(f'feature_importance and features must contain the same keys, found not shared keys: '
                                f'{symmetric_diff}')
            if any((not isinstance(v, float) for v in feature_importance.values())):
                raise Exception('feature_importance must contain only values of type float')

        if non_features:
            if not isinstance(non_features, dict):
                raise Exception('non_features must be a dict')
            intersection = set(non_features.keys()).intersection(features.keys())
            if intersection:
                raise Exception(f'features and non_features must contain different keys, found shared keys: '
                                f'{intersection}')
            for key, value in features.items():
                if not isinstance(key, str):
                    raise Exception(f'key of non_features must be of type str but got: {type(key)}')
                if value not in ColumnType.values():
                    raise Exception(f'value of non_features must be one of {ColumnType.values()} but got {value}')

        # Send request
        response = requests.post(f'{self.host}/models/{self.model["id"]}/version', json={
            'name': name,
            'features': features,
            'non_features': non_features or {},
            'feature_importance': feature_importance or {}
        })
        response.raise_for_status()
        model_version_id = response.json()['id']
        return self.version_client(model_version_id)

    def version_client(self, model_version_id: int) -> DeepchecksModelVersionClient:
        """Get client to interact with a given version of the model.

        Parameters
        ----------
        model_version_id: int

        Returns
        -------
        DeepchecksModelVersionClient
        """
        return DeepchecksModelVersionClient(self.host, model_version_id)

    def add_check(self):
        """Add new check for the model."""
        pass


class DeepchecksClient:
    """Client to interact with deepchecks monitoring.

    Parameters
    ----------
    host: str
        The deepchecks monitoring API host.
    """

    host: str

    def __init__(self, host):
        self.host = host + '/api/v1'
        # Will raise exception if host is not available
        requests.get(f'{self.host}/say-hello')

    def create_model(self, name: str, task_type: str, description: str = None) -> DeepchecksModelClient:
        """Create a new model.

        Parameters
        ----------
        name: str
            Display name of the model.
        task_type
            Task type of the model, one of: classification, regression
        description
            Additional description for the model

        Returns
        -------
        DeepchecksModelClient
            Client to interact with the created model.
        """
        if task_type not in TaskType.values():
            raise Exception(f'task_type must be one of {TaskType.values()}')
        response = requests.post(f'{self.host}/models', json={
            'name': name,
            'task_type': task_type,
            'description': description
        })
        response.raise_for_status()
        model_id = response.json()['id']
        return self.model_client(model_id)

    def model_client(self, model_id: int) -> DeepchecksModelClient:
        """Get client to interact with a specific model.

        Parameters
        ----------
        model_id: int
            Model id to get client for.

        Returns
        -------
        DeepchecksModelClient
            Client to interact with the model.
        """
        return DeepchecksModelClient(self.host, model_id)
