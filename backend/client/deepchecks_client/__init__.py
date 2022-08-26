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
import enum
import json
from datetime import datetime
from importlib.metadata import version
from typing import Dict, List, Optional, Union, Tuple
from urllib.parse import urljoin

import numpy as np
import pendulum as pdl
import requests
from requests import Response, HTTPError
from requests.exceptions import JSONDecodeError
from deepchecks.core.checks import BaseCheck, ReduceMixin
from deepchecks.tabular import Dataset
from deepchecks.tabular.checks import (CategoryMismatchTrainTest, NewLabelTrainTest, SingleDatasetPerformance,
                                       TrainTestFeatureDrift, TrainTestLabelDrift, TrainTestPredictionDrift)
from deepchecks.tabular.checks.data_integrity import PercentOfNulls
from jsonschema import validate

__all__ = ['DeepchecksClient']
__version__ = version("deepchecks_client")


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

    def request(self, method, url, *args, **kwargs) -> requests.Response:
        url = urljoin(self.base_url, url)
        return super().request(method, url, *args, **kwargs)


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
        self._log_samples = []
        
        self.schema = maybe_raise(
            self.session.get(f'model-versions/{model_version_id}/schema'),
            msg=f"Failed to obtaine ModelVersion(id:{model_version_id}) schema.\n{{error}}"
        ).json()
        
        self.ref_schema = maybe_raise(
            self.session.get(f'model-versions/{model_version_id}/reference-schema'),
            msg=f"Failed to obtaine ModelVersion(id:{model_version_id}) reference schema.\n{{error}}"
        ).json()
        
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
                raise TypeError(f'Not supported timestamp type: {type(timestamp)}')
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

        self._log_samples.append(sample)

    def send(self):
        """Send all the aggregated samples."""
        maybe_raise(
            self.session.post(
                f'model-versions/{self.model_version_id}/data',
                json=self._log_samples
            ),
            msg="Samples upload failure.\n{error}"
        )
        self._log_samples.clear()

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
            raise ValueError('Maximum size allowed for reference data is 100,000')

        data = dataset.features_columns.copy()
        if dataset.label_name:
            data[DeepchecksColumns.SAMPLE_LABEL_COL.value] = dataset.label_col
        if prediction_value is not None:
            data[DeepchecksColumns.SAMPLE_PRED_VALUE_COL.value] = prediction_value
        if prediction_label is not None:
            data[DeepchecksColumns.SAMPLE_PRED_LABEL_COL.value] = prediction_label

        for (_, row) in data.iterrows():
            item = row.to_dict()
            validate(schema=self.ref_schema, instance=item)

        maybe_raise(
            self.session.post(
                f'model-versions/{self.model_version_id}/reference',
                files={'file': data.to_json(orient='table', index=False)}
            ),
            msg="Reference upload failure.\n{error}"
        )

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
        
        maybe_raise(
            self.session.put(
                f'model-versions/{self.model_version_id}/data',
                json=[update]
            ),
            msg="Sample update failure.\n{error}"
        )


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
        self.model = maybe_raise(
            self.session.get(f'models/{model_id}'),
            msg=f"Failed to obtaine Model(id:{model_id}).\n{{error}}"
        ).json()

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
            raise ValueError('features must be a dict')
        for key, value in features.items():
            if not isinstance(key, str):
                raise ValueError(f'key of features must be of type str but got: {type(key)}')
            if value not in ColumnType.values():
                raise ValueError(f'value of features must be one of {ColumnType.values()} but got {value}')

        if feature_importance:
            if not isinstance(feature_importance, dict):
                raise ValueError('feature_importance must be a dict')
            symmetric_diff = set(feature_importance.keys()).symmetric_difference(features.keys())
            if symmetric_diff:
                raise ValueError(f'feature_importance and features must contain the same keys, found not shared keys: '
                                f'{symmetric_diff}')
            if any((not isinstance(v, float) for v in feature_importance.values())):
                raise ValueError('feature_importance must contain only values of type float')

        if non_features:
            if not isinstance(non_features, dict):
                raise ValueError('non_features must be a dict')
            intersection = set(non_features.keys()).intersection(features.keys())
            if intersection:
                raise ValueError(f'features and non_features must contain different keys, found shared keys: '
                                f'{intersection}')
            for key, value in features.items():
                if not isinstance(key, str):
                    raise ValueError(f'key of non_features must be of type str but got: {type(key)}')
                if value not in ColumnType.values():
                    raise ValueError(f'value of non_features must be one of {ColumnType.values()} but got {value}')

        response = maybe_raise(
            self.session.post(f'models/{self.model["id"]}/version', json={
                'name': name,
                'features': features,
                'non_features': non_features or {},
                'feature_importance': feature_importance or {}
            }),
            msg="Failed to create new model version.\n{error}"
        ).json()

        model_version_id = response['id']
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
    
    def add_default_checks(self):
        """Add default list of checks for the model."""
        return self.add_checks(checks={
            'Single Dataset Performance': SingleDatasetPerformance(),
            'Train-Test Feature Drift': TrainTestFeatureDrift(),
            'Train-Test Prediction Drift': TrainTestPredictionDrift(),
            'Train-Test Label Drift': TrainTestLabelDrift(),
            'Train-Test Category Mismatch': CategoryMismatchTrainTest(),
            'Train-Test New Label': NewLabelTrainTest(),
            'Percent Of Nulls': PercentOfNulls()
        })

    def add_checks(self, checks: Dict[str, BaseCheck]):
        """Add new check for the model."""
        serialized_checks = []
        
        for name, check in checks.items():
            if not isinstance(check, ReduceMixin):
                raise TypeError('Checks that do not implement "ReduceMixin" are not supported')
            serialized_checks.append({'name': name, 'config': check.config()})
        
        maybe_raise(
            self.session.post(
                url=f'models/{self.model["id"]}/checks',
                json=serialized_checks
            ),
            msg="Failed to create new check instances.\n{error}"
        )
    
    def get_checks(self) -> Dict[str, BaseCheck]:
        """Return list of check instances."""
        model_id = self.model["id"]
        
        data = maybe_raise(
            self.session.get(f'models/{self.model["id"]}/checks'),
            msg=f"Failed to obtaine Model(id:{model_id}) checks.\n{{error}}"
        ).json()

        if not isinstance(data, list):
            raise ValueError('Expected server to return a list of check configs.')
        
        return {
            it['name']: BaseCheck.from_config(it['config'])
            for it in data
        }
    
    def delete_checks(self, names: List[str]):
        model_id = self.model["id"]
        maybe_raise(
            self.session.delete(
                f'models/{model_id}/checks',
                params={'names': names}
            ),
            msg=f"Failed to drop Model(id:{model_id}) checks.\n{{error}}"
        )


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
            self.host = host + '/api/v1/'
            self.session = HttpSession(base_url=self.host)
        else:
            raise ValueError('"host" or "session" parameter must be provided')

        maybe_raise(
            self.session.get('say-hello'),
            msg="Server not available.\n{error}"
        )
        

    def create_model(
        self, 
        name: str, 
        task_type: str, 
        description: Optional[str] = None,
        checks: Optional[Dict[str, BaseCheck]] = None
    ) -> DeepchecksModelClient:
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
            raise ValueError(f'task_type must be one of {TaskType.values()}')
        
        response = maybe_raise(
            self.session.post('models', json={
                'name': name,
                'task_type': task_type,
                'description': description
            }),
            msg="Failed to create a new model instance.\n{error}"
        ).json()
        
        model_id = response['id']
        model = self.model_client(model_id)
        
        if checks is not None:
            model.add_checks(checks)
        else:
            model.add_default_checks()
        
        return model

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


def maybe_raise(
    response: Response,
    expected: Union[int, Tuple[int, int]] = (200, 299),
    msg: Optional[str] = None
) -> Response:
    """Verify response status and raise an HTTPError if got unexpected status code.
    
    Parameters
    ==========
    response : Response
        http response instance
    expected : Union[int, Tuple[int, int]] , default (200, 299)
        HTTP status code that is expected to receive 
    msg: Optional[str] , default None
        error message to show in case of unexpected status code,
        next template parameters available: 
        - status (HTTP status code)
        - reason (HTTP reason message)
        - url (request url)
        - body (response payload if available)
        - error (default error message that will include all previous parameters)

    Returns
    =======
    Respoonse
    """
    status = response.status_code
    url = response.url
    reason = response.reason

    error_template = "Error: {status} {reason} url {url}.\nBody:\n{body}"
    client_error_template = "{status} Client Error: {reason} for url: {url}.\nBody:\n{body}"
    server_error_template = "{status} Server Internal Error: {reason} for url: {url}.\nBody:\n{body}"

    def select_template(status):
        if 400 <= status <= 499:
            return client_error_template
        elif 500 <= status <= 599:
            return server_error_template
        else:
            return error_template
        
    def process_body():
        try:
            return json.dumps(response.json(), indent=3)
        except JSONDecodeError:
            return

    if isinstance(expected, int) and status != expected:
        body = process_body()
        error = select_template(status).format(status=status, reason=reason, url=url, body=body)
        raise HTTPError(
            error
            if msg is None
            else msg.format(status=status, reason=reason, url=url, body=body, error=error)
        )

    if isinstance(expected, (tuple, list)) and not (expected[0] <= status <= expected[1]):
        body = process_body()
        error = select_template(status).format(status=status, reason=reason, url=url, body=body)
        raise HTTPError(
            error
            if msg is None
            else msg.format(status=status, reason=reason, url=url, body=body, error=error)
        )

    return response


    
