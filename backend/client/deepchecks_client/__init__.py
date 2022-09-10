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
import warnings
from collections import defaultdict
from datetime import datetime
from importlib.metadata import version
from typing import Any, Dict, List, Optional, Tuple, Union
from urllib.parse import urljoin

import numpy as np
import pandas as pd
import pendulum as pdl
import requests
import torch
from deepchecks.core.checks import BaseCheck
from deepchecks.core.reduce_classes import ReduceMixin
from deepchecks.tabular import Dataset
from deepchecks.tabular.checks import (CategoryMismatchTrainTest, NewLabelTrainTest, SingleDatasetPerformance,
                                       TrainTestFeatureDrift, TrainTestLabelDrift, TrainTestPredictionDrift)
from deepchecks.tabular.checks.data_integrity import PercentOfNulls
from deepchecks.vision import VisionData
from deepchecks.vision.task_type import TaskType as VisTaskType
from deepchecks.vision.utils.image_properties import default_image_properties
from deepchecks.vision.utils.vision_properties import PropertiesInputType
from jsonschema import validate
from requests import HTTPError, Response
from requests.exceptions import JSONDecodeError
from deepchecks.vision.utils.label_prediction_properties import DEFAULT_OBJECT_DETECTION_LABEL_PROPERTIES

from deepchecks_client.utils import calc_image_bbox_props, create_static_properties

__all__ = ['DeepchecksClient']
__version__ = version("deepchecks_client")


def _create_timestamp(timestamp):
    if timestamp:
        if isinstance(timestamp, int):
            return pdl.from_timestamp(timestamp, pdl.local_timezone())
        elif isinstance(timestamp, datetime):
            # If no timezone in datetime, assumed to be UTC and converted to local timezone
            return pdl.instance(timestamp, pdl.local_timezone())
        else:
            raise Exception(f'Not supported timestamp type: {type(timestamp)}')
    else:
        return pdl.now()


class DeepchecksEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.generic):
            if np.isnan(obj):
                return None
            return obj.item()
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, torch.Tensor):
            tensor_values = obj.cpu().detach().numpy().tolist()
            return tuple([self.default(v) for v in tensor_values])
        if isinstance(obj, dict):
            return {k: self.default(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return tuple([self.default(v) for v in obj])
        return obj


class TaskType(enum.Enum):
    """Enum containing supported task types."""

    REGRESSION = "regression"
    CLASSIFICATION = "classification"
    VISION_CLASSIFICATION = "vision_classification"
    VISION_DETECTION = "vision_detection"

    @classmethod
    def values(cls):
        return [e.value for e in TaskType]


class ColumnType(enum.Enum):
    """Enum containing possible types of data."""

    NUMERIC = "numeric"
    INTEGER = "integer"
    CATEGORICAL = "categorical"
    BOOLEAN = "boolean"
    TEXT = "text"
    ARRAY_FLOAT = "array_float"
    ARRAY_FLOAT_2D = "array_float_2d"
    DATETIME = "datetime"

    @classmethod
    def values(cls):
        return [e.value for e in ColumnType]


class DeepchecksColumns(enum.Enum):
    """Enum of saved deepchecks columns."""

    SAMPLE_ID_COL = "_dc_sample_id"
    SAMPLE_TS_COL = "_dc_time"
    SAMPLE_LABEL_COL = "_dc_label"
    SAMPLE_PRED_PROBA_COL = "_dc_prediction_probabilities"
    SAMPLE_PRED_COL = "_dc_prediction"


class HttpSession(requests.Session):

    def __init__(self, base_url: str, token=None):
        super().__init__()
        self.base_url = base_url
        self.token = token

    def request(self, method, url, *args, **kwargs) -> requests.Response:
        url = urljoin(self.base_url, url)
        headers = kwargs.pop('headers') if 'headers' in kwargs else {}
        if self.token:
            headers['Authorization'] = f'Basic {self.token}'
        return super().request(method, url, *args, headers=headers, **kwargs)


class DeepchecksModelVersionClient:
    """Client to interact with a given model version, including all functions to send data.

    Parameters
    ----------
    host: str
        The deepchecks monitoring API host.
    model_version_id: int
        The id of the model version.
    image_properties : Optional[List[Dict[str, Any]]]
        The image properties to use for the reference.
    """

    model_version_id: int
    schema: dict
    ref_schema: dict

    def __init__(
            self,
            model_version_id: int,
            model: dict,
            session: requests.Session,
            image_properties: Optional[List[Dict[str, Any]]],
    ):
        self.session = session
        self.model = model
        self.model_version_id = model_version_id
        self.image_properties = image_properties
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
                   prediction_proba=None,
                   prediction=None,
                   label=None,
                   **values):
        """Send sample for the model version.

        Parameters
        ----------
        sample_id: str
        timestamp: Union[datetime, int]
            If no timezone info is provided on the datetime assumes local timezone.
        prediction_proba
            Prediction value if exists
        prediction
            Prediction label if exists
        label
            True label of sample
        values
            All features of the sample and optional non_features
        """
        timestamp = _create_timestamp(timestamp)

        sample = {
            DeepchecksColumns.SAMPLE_ID_COL.value: sample_id,
            DeepchecksColumns.SAMPLE_TS_COL.value: timestamp.to_iso8601_string(),
            **values
        }

        if prediction is None:
            raise Exception('Model prediction must be provided when logging a sample')

        if TaskType(self.model['task_type']) == TaskType.CLASSIFICATION:
            if label is not None:
                sample[DeepchecksColumns.SAMPLE_LABEL_COL.value] = str(label)
            if prediction_proba is not None:
                sample[DeepchecksColumns.SAMPLE_PRED_PROBA_COL.value] = prediction_proba
            sample[DeepchecksColumns.SAMPLE_PRED_COL.value] = str(prediction)
        elif TaskType(self.model['task_type']) == TaskType.REGRESSION:
            if label is not None:
                sample[DeepchecksColumns.SAMPLE_LABEL_COL.value] = float(label)
            sample[DeepchecksColumns.SAMPLE_PRED_COL.value] = float(prediction)
        else:
            raise Exception(f'Unknown task type provided')

        # Make the sample json-compatible
        sample = DeepchecksEncoder().default(sample)
        validate(instance=sample, schema=self.schema)

        self._log_samples.append(sample)

    def log_vision_sample(self,
                          sample_id: str,
                          img: np.ndarray,
                          label,
                          timestamp: Union[datetime, int, None] = None,
                          prediction=None):
        """Send sample for the model version.

        Parameters
        ----------
        sample_id: str
        img
        timestamp: Union[datetime, int]
            If no timezone info is provided on the datetime assumes local timezone.
        prediction
            Prediction value if exists
        label
            label
        """
        timestamp = _create_timestamp(timestamp)
        task_type = TaskType(self.model['task_type'])
        vis_task_type = \
            VisTaskType.CLASSIFICATION if task_type == TaskType.VISION_CLASSIFICATION else VisTaskType.OBJECT_DETECTION
        image_props, bbox_props = \
            calc_image_bbox_props([img], [label], vis_task_type, self.image_properties)
        prop_vals = {}
        if image_props:
            for prop_name, prop_val in image_props.items():
                prop_vals[PropertiesInputType.IMAGES.value + ' ' + prop_name] = prop_val[0]
        if bbox_props:
            for prop_name, prop_val in bbox_props.items():
                prop_vals[PropertiesInputType.PARTIAL_IMAGES.value + ' ' + prop_name] = prop_val[0]
        sample = {
            DeepchecksColumns.SAMPLE_ID_COL.value: sample_id,
            DeepchecksColumns.SAMPLE_TS_COL.value: timestamp.to_iso8601_string(),
            **prop_vals
        }

        if prediction is not None:
            sample[DeepchecksColumns.SAMPLE_PRED_COL.value] = prediction
        sample[DeepchecksColumns.SAMPLE_LABEL_COL.value] = label

        # Make the sample json-compatible
        sample = DeepchecksEncoder().default(sample)
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

    def upload_vision_reference(
            self,
            vision_data: VisionData,
            predictions: Optional[Dict[int, torch.Tensor]] = None):
        """Upload reference data. Possible to upload only once for a given model version.

        Parameters
        ----------
        vision_data: VisionData
            The vision data that containes the refrense data.
        predictions: Optional[Dict[int, np.ndarray]]
            The predictions for the reference data in format {<index>: <prediction>}.
        """
        if len(vision_data) > 100_000:
            raise Exception('Maximum size allowed for reference data is 100,000')

        static_props = create_static_properties(vision_data, self.image_properties)

        data = defaultdict(dict)
        for i, batch in enumerate(vision_data):
            indexes = list(vision_data.data_loader.batch_sampler)[i]
            labels = dict(zip(indexes, vision_data.batch_to_labels(batch)))
            for ind in indexes:
                data[ind][DeepchecksColumns.SAMPLE_LABEL_COL.value] = _un_tensor(labels[ind])
                if predictions:
                    data[ind][DeepchecksColumns.SAMPLE_PRED_COL.value] = _un_tensor(predictions[ind])
                props = static_props[ind]
                for prop_type in props.keys():
                    for prop_name in props[prop_type].keys():
                        data[ind][prop_type + ' ' + prop_name] = props[prop_type][prop_name]

        data = pd.DataFrame(data).T
        for (_, row) in data.iterrows():
            item = row.to_dict()
            validate(schema=self.ref_schema, instance=item)

        self.session.post(
            f'model-versions/{self.model_version_id}/reference',
            files={'file': data.to_json(orient='table', index=False)}
        ).raise_for_status()

    def upload_reference(
            self,
            dataset: Dataset,
            prediction_proba: Optional[np.ndarray] = None,
            prediction: np.ndarray = None
    ):
        """Upload reference data. Possible to upload only once for a given model version.

        Parameters
        ----------
        dataset: deepchecks.tabular.Dataset
        prediction_proba: np.ndarray
        prediction: np.ndarray
        """
        if prediction is None:
            raise Exception('Model predictions on the reference data is required')

        data = dataset.features_columns.copy()
        if dataset.label_type.value == 'regression':
            if dataset.has_label():
                data[DeepchecksColumns.SAMPLE_LABEL_COL.value] = list(dataset.label_col.apply(float))
            data[DeepchecksColumns.SAMPLE_PRED_COL.value] = [float(x) for x in prediction]
        else:
            if dataset.has_label():
                data[DeepchecksColumns.SAMPLE_LABEL_COL.value] = list(dataset.label_col.apply(str))
            if prediction_proba is None:
                raise Exception('Model predictions probabilities on the reference data is required for '
                                'classification task type')
            elif isinstance(prediction_proba, pd.DataFrame):
                prediction_proba = np.asarray(prediction_proba)
            data[DeepchecksColumns.SAMPLE_PRED_PROBA_COL.value] = prediction_proba
            data[DeepchecksColumns.SAMPLE_PRED_COL.value] = [str(x) for x in prediction]

        if len(dataset) > 100_000:
            data = data.sample(100000)
            warnings.warn('Maximum size allowed for reference data is 100,000, applying random sampling')

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

        # Make the update json-compatible
        update = DeepchecksEncoder().default(update)
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

    def create_vision_version(
            self,
            name: str,
            vision_data: VisionData,
            image_properties: List[Dict[str, Any]] = default_image_properties
    ) -> DeepchecksModelVersionClient:
        """Create a new model version for vision data.

        Parameters
        ----------
        name : str
            The name of the new version.
        vision_data : VisionData
            The vision data to use as reference.
        image_properties : List[Dict[str, Any]]
            The image properties to use for the reference.

        Returns
        -------
        DeepchecksModelVersionClient
            Client to interact with the newly created version.
        """
        # Start with validation
        if not isinstance(image_properties, list):
            raise Exception('image properties must be a list')

        features = {}
        for prop in image_properties:
            prop_name = prop['name']
            features[PropertiesInputType.IMAGES.value + ' ' + prop_name] = ColumnType.NUMERIC.value
            if vision_data.task_type == VisTaskType.OBJECT_DETECTION:
                features[PropertiesInputType.PARTIAL_IMAGES.value + ' ' + prop_name] = ColumnType.ARRAY_FLOAT.value

        # Send request
        response = self.session.post(f'models/{self.model["id"]}/version', json={
            'name': name,
            'features': features,
            'non_features': {},
        })
        response.raise_for_status()
        model_version_id = response.json()['id']
        return self.version_client(model_version_id, image_properties=image_properties)

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

    def version_client(self,
                       model_version_id: int,
                       image_properties: Optional[List[Dict[str, Any]]] = default_image_properties) \
            -> DeepchecksModelVersionClient:
        """Get client to interact with a given version of the model.

        Parameters
        ----------
        model_version_id: int
        image_properties : Optional[List[Dict[str, Any]]]
            The image properties to use for the reference.

        Returns
        -------
        DeepchecksModelVersionClient
        """
        return DeepchecksModelVersionClient(model_version_id, self.model,
                                            session=self.session, image_properties=image_properties)

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
            host: str,
            token: Optional[str] = None
    ):
        self.host = host + '/api/v1/'
        self.session = HttpSession(base_url=self.host, token=token)

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
