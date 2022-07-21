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
from typing import Dict, Optional, Union
from urllib.parse import urljoin

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


class HttpSession(requests.Session):

    def __init__(self, *args, base_url: str, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.base_url = base_url

    def request(self, *args, url: str, **kwargs) -> requests.Response:
        url = urljoin(self.base_url, url)
        return super().request(*args, url=url, **kwargs)


class DeepchecksModelVersionClient:
    """Client to interact with a given model version, including all functions to send data.

    Parameters
    ----------
    host: str
        The deepchecks monitoring API host.
    model_version_id: int
        The id of the model version.
    """

    model_version_id: int
    schema: dict
    ref_schema: dict

    def __init__(
        self,
        model_version_id: int,
        session: requests.Session
    ):
        self.session = session
        self.model_version_id = model_version_id
        response = self.session.get(f'model-versions/{model_version_id}/schema')
        response.raise_for_status()
        self.schema = response.json()
        response = self.session.get(f'model-versions/{model_version_id}/reference-schema')
        response.raise_for_status()
        self.ref_schema = response.json()

    def log_sample(self,
                   sample_id: str,
                   timestamp: Union[datetime, int, None] = None,
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

        self.session.post(
            f'model-versions/{self.model_version_id}/data',
            json=sample
        ).raise_for_status()

    def upload_reference(
        self,
        dataset: Dataset,
        prediction_value: Optional[np.ndarray] = None,
        prediction_label: Optional[np.ndarray] = None
    ):
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

        self.session.post(
            f'model-versions/{self.model_version_id}/reference',
            files={'file': data.to_json(orient='table', index=False)}
        ).raise_for_status()

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
        self.session.put(
            f'model-versions/{self.model_version_id}/data',
            json=update
        ).raise_for_status()


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

    def __init__(
        self,
        model_id: int,
        session: requests.Session
    ):
        self.session = session
        response = self.session.get(f'models/{model_id}')
        response.raise_for_status()
        self.model = response.json()

    def create_version(
        self,
        name: str,
        features: Dict[str, str],
        non_features: Optional[Dict[str, str]] = None,
        feature_importance: Optional[Dict[str, float]] = None
    ) -> DeepchecksModelVersionClient:
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
        response = self.session.post(f'models/{self.model["id"]}/version', json={
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
        return DeepchecksModelVersionClient(model_version_id, session=self.session)

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

    def __init__(
        self,
        host: Optional[str] = None,
        session: Optional[HttpSession] = None
    ):
        if session is not None and hasattr(session, 'base_url'):
            self.session = session
            self.host = session.base_url  # type: ignore
        elif host is not None:
            self.host = host + '/api/v1'
            self.session = HttpSession(base_url=host)
        else:
            raise ValueError('"host" or "session" parameter must be provided')

        self.session.get('say-hello')

    def create_model(self, name: str, task_type: str, description: Optional[str] = None) -> DeepchecksModelClient:
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
        response = self.session.post('models', json={
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
        return DeepchecksModelClient(model_id, session=self.session)
