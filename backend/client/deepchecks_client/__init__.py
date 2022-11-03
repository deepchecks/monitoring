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
"""Defines the entrance points for the client."""
import typing as t
import warnings

import numpy as np
from deepchecks.core.errors import DeepchecksValueError
from deepchecks.tabular import Dataset
from deepchecks_client.core.api import API
from deepchecks_client.core.client import DeepchecksModelClient, DeepchecksModelVersionClient
from deepchecks_client.core.utils import TaskType, pretty_print
from deepchecks_client.tabular import create_schema, read_schema
from deepchecks_client.tabular.client import DeepchecksModelClient as TabularModelClient
from deepchecks_client.tabular.client import DeepchecksModelVersionClient as TabularModelVersionClient
from deepchecks_client.vision.client import DeepchecksModelClient as VisionModelClient

try:
    from importlib import metadata
except ImportError:  # for Python<3.8
    import importlib_metadata as metadata

__version__ = metadata.version('deepchecks_client')
__all__ = ['DeepchecksClient', 'TaskType', 'create_schema', 'read_schema']


class DeepchecksClient:
    """Client to interact with deepchecks monitoring.

    Parameters
    ----------
    host: str
        The deepchecks monitoring API host.
    token: Optional[str]
        The deepchecks API token
    """

    def __init__(
        self,
        host: t.Optional[str] = None,
        token: t.Optional[str] = None,
        api: t.Optional[API] = None
    ):
        if host is not None:
            self.api = API.instantiate(host=host, token=token)
        elif api is not None:
            self.api = api
        else:
            raise ValueError('host or api parameter must be provided')

        self._model_clients = {}
        self.api.say_hello()

    def tabular_model(
        self,
        name: str,
        task_type: t.Union[str, TaskType, None] = None,
        description: t.Optional[str] = None,
        create_defaults: bool = True
    ) -> TabularModelClient:
        """Get or create tabular model client."""
        if task_type is not None:
            task_type = TaskType(task_type)
            if task_type not in TaskType.tabular_types():
                raise ValueError(f'not a tabular task type - {task_type}')
        client = self.model(
            name=name,
            task_type=task_type,
            description=description,
            create_defaults=create_defaults
        )
        if not isinstance(client, TabularModelClient):
            raise ValueError(f'Model with name "{name}" exists but is not of tabular type')
        return client

    def vision_model(
        self,
        name: str,
        task_type: t.Union[str, TaskType, None] = None,
        description: t.Optional[str] = None,
        create_defaults: bool = True
    ) -> VisionModelClient:
        """Get or create vision model client."""
        if task_type is not None:
            task_type = TaskType(task_type)
            if task_type not in TaskType.vision_types():
                raise ValueError(f'not a vision task type - {task_type}')
        client = self.model(
            name=name,
            task_type=task_type,
            description=description,
            create_defaults=create_defaults
        )
        if not isinstance(client, VisionModelClient):
            raise ValueError(f'Model with name "{name}" exists but is not of vision type')
        return client

    def model(
        self,
        name: str,
        task_type: t.Union[str, TaskType, None] = None,
        description: t.Optional[str] = None,
        create_defaults: bool = True
    ) -> DeepchecksModelClient:
        """Get or create a new model.

        Parameters
        ----------
        name: str
            Display name of the model.
        task_type: str, default: None
            Task type of the model, possible values are regression, multiclass, binary, vision_classification and
            vision_detection. Required for creation of a new model.
        description: str, default: None
            Additional description for the model.
        create_defaults: bool, default: True
            Whether to add default check, monitors and alerts to the model.

        Returns
        -------
        DeepchecksModelClient
            Client to interact with the created model.
        """
        task_type = TaskType(task_type) if task_type is not None else None
        available_models = self.api.fetch_models()
        available_models = t.cast(t.List[t.Dict[str, t.Any]], available_models)
        existing_model: t.Optional[t.Dict[str, t.Any]] = None

        for model in available_models:
            if name == model['name']:
                existing_model = model
                break

        if existing_model is not None:
            existing_model_type = TaskType(existing_model['task_type'])
            if task_type is not None and task_type != existing_model_type:
                raise ValueError(f'Model with name {name} already exists, but has different task type.')
            if description is not None and description != existing_model['description']:
                raise ValueError(f'Model with name {name} already exists, but has different description.')
            client, _ = self._create_model_client(model_id=existing_model['id'], task_type=existing_model_type)
            return client

        if task_type is None:
            raise ValueError('task_type must be provided for creation of a new model')

        created_model = self.api.create_model({
            'name': name,
            'task_type': task_type.value,
            'description': description
        })

        created_model = t.cast(t.Dict[str, t.Any], created_model)
        created_model_id = created_model['id']
        model_client, client_existed = self._create_model_client(model_id=created_model_id, task_type=task_type)

        if client_existed:
            return model_client

        msg = f'Model {name} was successfully created!.'

        if create_defaults:
            model_client._add_defaults()  # pylint: disable=protected-access
            msg += ' Default checks, monitors and alerts added.'

        pretty_print(msg)
        return model_client

    def _select_model_client_type(self, task_type: TaskType) -> t.Union[
        t.Type[TabularModelClient],
        t.Type[VisionModelClient]
    ]:
        """Select model type."""
        if task_type in TaskType.vision_types():
            return VisionModelClient
        elif task_type in TaskType.tabular_types():
            return TabularModelClient
        else:
            raise ValueError(f'Unknow task type - {task_type}')

    def _create_model_client(
        self,
        model_id: int,
        task_type: TaskType
    ) -> t.Tuple[DeepchecksModelClient, bool]:
        """Get client to interact with a specific model.

        Parameters
        ----------
        model_id: int
            Model id to get client for.
        task_type: TaskType
            Task type of the model.

        Returns
        -------
        DeepchecksModelClient
            Client to interact with the model.
        """
        existed = True
        if self._model_clients.get(model_id) is None:
            existed = False
            client_type = self._select_model_client_type(task_type)
            self._model_clients[model_id] = client_type(model_id=model_id, api=self.api)
        return self._model_clients[model_id], existed

    def get_model_version(self, model_name: str, version_name: str) -> DeepchecksModelVersionClient:
        """Get client to interact with a specific model version.

        Parameters
        ----------
        model_name: str
            Name of the model.
        version_name: str
            Name of the model version.

        Returns
        -------
        DeepchecksModelVersionClient
            Client to interact with the model version.
        """
        available_models = self.api.fetch_models()
        available_models = t.cast(t.List[t.Dict[str, t.Any]], available_models)

        if model_name not in [model['name'] for model in available_models]:
            raise ValueError(f'Model with name {model_name} does not exist.')

        model = self.model(model_name)
        existing_version_id = model._get_existing_version_id_or_none(  # pylint: disable=protected-access
            version_name=version_name
        )

        if existing_version_id is None:
            raise ValueError(f'Model {model_name} does not have a version with name {version_name}.')
        else:
            return model.version(version_name)

    # TODO: why this method is here and not in tabular.DeepchecksModelClient?
    def create_tabular_model_version(
        self,
        model_name: str,
        schema_file,
        version_name: str = 'v1',
        reference_dataset: t.Optional[Dataset] = None,
        reference_predictions: t.Optional[np.ndarray] = None,
        reference_probas: t.Optional[np.ndarray] = None,
        feature_importance: t.Optional[t.Dict[str, float]] = None,
        task_type: t.Union[str, TaskType, None] = None,
        description: str = '',
        model_classes: t.Optional[t.Sequence[str]] = None
    ) -> TabularModelVersionClient:
        """
        Create a tabular model version and uploads the reference data if provided.

        Parameters
        ----------
        model_name: str
            A name for the model.
        schema_file:
            String path or file like object containing the data schema.
        version_name: str, default: 'v1'
            A name for the version.
        reference_dataset: Optional[Dataset], default: None
            The reference dataset object.
        reference_predictions: np.ndarray, default: None
            The model predictions for the reference data.
        reference_probas: np.ndarray, default: None
            The model predicted class probabilities for the reference data, relevant only for classification tasks.
        feature_importance: Optional[Dict[str, float]], default: None
            a dictionary of feature names and their feature importance value.
        task_type: Optional[str], default: None
            The task type of the model, required for creation of a new model. Can be inferred from
            dataset.label_type if set. Possible values are regression, multiclass, binary
        description: str, default: ''
            A short description of the model.
        model_classes: Optional[Sequence[str]], default: None
            List of classes used by the model. If not defined and `reference_probas` is passed, then classes are
            inferred from predictions and label.

        Returns
        -------
        tabular.client.DeepchecksModelVersionClient
            Return the created model version client.
        """
        try:
            self.get_model_version(model_name=model_name, version_name=version_name)
            raise DeepchecksValueError(
                f'Model {model_name} already has a version named {version_name}. '
                'Use get_model_version to retrieve it or create a new version '
                'with a different name.'
            )
        except ValueError:
            pass

        schema = read_schema(schema_file)
        features_dict, non_features_dict = schema['features'], schema['non_features']
        if set(features_dict.keys()) != set(reference_dataset.features):
            raise DeepchecksValueError(
                f'Features found in reference dataset ({reference_dataset.features}) do not '
                f'match feature schema ({features_dict.keys()}).'
            )

        task_type = TaskType(task_type) if task_type is not None else None

        if task_type is None and reference_dataset.label_type is not None:
            task_type = TaskType(reference_dataset.label_type)
            warnings.warn(
                f'Task type was inferred to be {task_type.value} based on reference dataset provided. '
                f'It is recommended to provide it directly via the task_type argument.'
            )

        if reference_probas is not None:
            # validate reference probabilities
            if task_type not in {TaskType.MULTICLASS, TaskType.BINARY}:
                raise DeepchecksValueError(f'Can\'t pass probabilities for task_type {task_type.value}')

            if not isinstance(reference_probas, np.ndarray):
                raise DeepchecksValueError(
                    'reference_probas have to be numpy array but got '
                    f'{type(reference_probas).__name__}'
                )

            # Inferring the model classes if needed
            if model_classes is None:
                model_classes = sorted(
                    set(np.unique(reference_predictions))
                    | set(reference_dataset.label_col.unique())
                )
                warnings.warn(
                    'Model classes were inferred based on reference predictions and dataset label. '
                    'It is recommended to provide it directly via the model_classes argument.'
                )

            if len(model_classes) != reference_probas.shape[1]:
                raise DeepchecksValueError(
                    f'Got {reference_probas.shape[1]} columns in reference_probas, but '
                    f'{len(model_classes)} model classes were provided.'
                )

        version_client = self.tabular_model(model_name, task_type, description).version(
            version_name,
            features=features_dict,
            non_features=non_features_dict,
            feature_importance=feature_importance,
            model_classes=model_classes
        )

        if reference_dataset is not None:
            version_client.upload_reference(
                reference_dataset,
                prediction_probas=reference_probas,
                predictions=reference_predictions
            )
            pretty_print('Reference data uploaded.')

        return version_client

    def delete_model(self, model_name: str):
        """Delete a model by its name.

        Parameters
        ----------
        model_name: str
            The model to delete
        """
        available_models = self.api.fetch_models()
        available_models = t.cast(t.List[t.Dict[str, t.Any]], available_models)
        existing_model: t.Optional[t.Dict[str, t.Any]] = None

        for model in available_models:
            if model_name == model['name']:
                existing_model = model
                break

        if existing_model is None:
            raise ValueError(f'Model {model_name} does not exist.')

        self.api.delete_model_by_id(existing_model['id'])
        pretty_print(f'The following model was successfully deleted: {model_name}')
