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
import typing as t
from importlib.metadata import version
from urllib.parse import urljoin

import requests
from deepchecks.core.checks import BaseCheck
from deepchecks.core.reduce_classes import ReduceMixin
from jsonschema import validate

from deepchecks_client.core.utils import DeepchecksEncoder, maybe_raise

__all__ = ['DeepchecksClient', 'ColumnType', 'TaskType', 'DeepchecksColumns']
__version__ = version("deepchecks_client")


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
        headers = kwargs.get('headers', {})
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
    _log_samples: list

    def __init__(
            self,
            model_version_id: int,
            model: dict,
            session: requests.Session,
    ):
        self.session = session
        self.model = model
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

    def log_sample(self):
        """Send sample for the model version."""
        raise NotImplementedError

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

    def upload_reference(self):
        """Upload reference data. Possible to upload only once for a given model version."""
        raise NotImplementedError

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
        self._model_version_clients = {}

    def create_version(self) -> DeepchecksModelVersionClient:
        """Create a new model version."""
        raise NotImplementedError

    def _get_model_version_id(self, model_version_name):
        versions = self.get_versions()
        return versions.get(model_version_name)

    def _version_client(self) -> DeepchecksModelVersionClient:
        """Get client to interact with a given version of the model."""
        raise NotImplementedError

    def add_default_checks(self):
        """Add default list of checks for the model."""
        raise NotImplementedError

    def add_checks(self, checks: t.Dict[str, BaseCheck]):
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

    def get_checks(self) -> t.Dict[str, BaseCheck]:
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

    def get_versions(self) -> t.Dict[str, str]:
        """Return list of model version (id and name)."""
        model_id = self.model["id"]

        model_versions = maybe_raise(
            self.session.get(f'models/{self.model["id"]}/versions'),
            msg=f"Failed to obtaine Model(id:{model_id}) checks.\n{{error}}"
        ).json()

        if not isinstance(model_versions, list):
            raise ValueError('Expected server to return a list of model versions.')

        return {model_version['name']: model_version['id'] for model_version in model_versions}

    def delete_checks(self, names: t.List[str]):
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
            token: t.Optional[str] = None
    ):
        self.host = host + '/api/v1/'
        self.session = HttpSession(base_url=self.host, token=token)
        self._model_clients = {}

        maybe_raise(
            self.session.get('say-hello'),
            msg="Server not available.\n{error}"
        )

    def model(
            self,
            name: str,
            task_type: str,
            description: t.Optional[str] = None,
            checks: t.Optional[t.Dict[str, BaseCheck]] = None
    ) -> DeepchecksModelClient:
        """Get or create a new model.

        Parameters
        ----------
        name: str
            Display name of the model.
        task_type
            Task type of the model, one of: # TODO
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
        model = self._model_client(model_id, task_type)
        model_checks = model.get_checks()

        if len(model_checks) == 0:
            if checks is not None:
                model.add_checks(checks)
            else:
                model.add_default_checks()
        else:
            if checks is not None:
                new_checks = {}
                for check_name, check_val in checks.items():
                    if check_name not in model_checks:
                        new_checks[check_name] = check_val
                if len(new_checks) > 0:
                    model.add_checks(checks)

        return model

    def _model_client(self, model_id: int, task_type: str) -> DeepchecksModelClient:
        """Get client to interact with a specific model.

        Parameters
        ----------
        model_id: int
            Model id to get client for.
        task_type: str
            Task type of the model, one of: # TODO
        Returns
        -------
        DeepchecksModelClient
            Client to interact with the model.
        """    
        from deepchecks_client.tabular.client import DeepchecksModelClient as TabularDeepchecksModelClient
        from deepchecks_client.vision.client import DeepchecksModelClient as VisionDeepchecksModelClient

        if self._model_clients.get(model_id) is None:
            if 'vision' in task_type:
                self._model_clients[model_id] =  VisionDeepchecksModelClient(model_id, session=self.session)
            self._model_clients[model_id] =  TabularDeepchecksModelClient(model_id, session=self.session)
        return self._model_clients[model_id]
