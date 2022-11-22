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
# pylint: disable=import-outside-toplevel
"""Defines the entrance points for the client."""
import io
import pathlib
import typing as t
import warnings

import numpy as np
import pandas as pd
from deepchecks.core.errors import DeepchecksValueError
from deepchecks.tabular import Dataset
from deepchecks_client._shared_docs import docstrings
from deepchecks_client.core.api import API
from deepchecks_client.core.client import DeepchecksModelClient, DeepchecksModelVersionClient
from deepchecks_client.core.utils import TaskType, pretty_print
from deepchecks_client.tabular import create_schema, read_schema
from deepchecks_client.tabular.client import DeepchecksModelClient as TabularModelClient
from deepchecks_client.tabular.client import DeepchecksModelVersionClient as TabularModelVersionClient
from deepchecks_client.tabular.utils import DataSchema

if t.TYPE_CHECKING:
    from deepchecks.vision import VisionData
    from deepchecks_client.vision.client import ARRAY

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
    host: t.Optional[str]
        The deepchecks monitoring API host.
    token: t.Optional[str]
        The deepchecks API token.
    api: t.Optional[API]
        The deepchecks API client.
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

    def get_or_create_model(
        self,
        name: str,
        task_type: t.Union[str, TaskType, None] = None,
        description: t.Optional[str] = None,
        create_model_defaults: bool = True
    ) -> DeepchecksModelClient:
        """Retrieve a model client based on its name if exists, or creates a new model with the provided parameters.

        A model client is a client to interact with a specific model. It is used to update checks, monitors and alerts
        associated with the model. In addition, it can be used to create a new model version.
        Parameters
        ----------
        name: str
            Display name of the model.
        task_type: str, default: None
            Task type of the model, possible values are regression, multiclass, binary, vision_classification and
            vision_detection. Required for creation of a new model.
        description: str, default: None
            Additional description for the model.
        create_model_defaults: bool, default: True
            Whether to add default check, monitors and alerts to the model.

        Returns
        -------
        DeepchecksModelClient
            Client to interact with the model.
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
            return self._model_client_from_model_id(model_id=existing_model['id'], task_type=existing_model_type)

        if task_type is None:
            raise ValueError('task_type must be provided for creation of a new model')

        created_model = self.api.create_model({
            'name': name,
            'task_type': task_type.value,
            'description': description
        })

        created_model = t.cast(t.Dict[str, t.Any], created_model)
        model_client = self._model_client_from_model_id(model_id=created_model['id'], task_type=task_type)
        msg = f'Model {name} was successfully created!.'

        if create_model_defaults:
            model_client._add_defaults()  # pylint: disable=protected-access
            msg += ' Default checks, monitors and alerts added.'

        pretty_print(msg)
        return model_client

    def _model_client_from_model_id(
        self,
        model_id: int,
        task_type: TaskType
    ) -> DeepchecksModelClient:
        """Get client to interact with a specific model from internal cache (based on id).

        Parameters
        ----------
        model_id: int
            Model id to get client for.
        task_type: TaskType
            Task type of the model. Used to determine the correct client type.

        Returns
        -------
        DeepchecksModelClient
            Client to interact with the model.
        """
        if self._model_clients.get(model_id) is not None:
            pass
        elif task_type in TaskType.vision_types():
            from deepchecks_client.vision.client import DeepchecksModelClient as VisionModelClient
            self._model_clients[model_id] = VisionModelClient(model_id=model_id, api=self.api)
        elif task_type in TaskType.tabular_types():
            self._model_clients[model_id] = TabularModelClient(model_id=model_id, api=self.api)
        else:
            raise ValueError(f'Unknown task type - {task_type}')

        return self._model_clients[model_id]

    def get_model_version(self, model_name: str, version_name: str) -> DeepchecksModelVersionClient:
        """Get client to interact with a specific model version.

        Raises
        ------
        ValueError
            If model or version does not exist.
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

        model = self.get_or_create_model(model_name)
        existing_version_id = model._get_existing_version_id_or_none(  # pylint: disable=protected-access
            version_name=version_name
        )

        if existing_version_id is None:
            raise ValueError(f'Model {model_name} does not have a version with name {version_name}.')
        else:
            return model.version(version_name)

    def create_vision_model_version(
        self,
        *,
        model_name: str,
        reference_dataset: 'VisionData',
        version_name: str = 'v1',
        description: str = '',
        reference_predictions: t.Optional[t.Union[t.Dict[int, 'ARRAY'], t.List['ARRAY']]] = None,
        task_type: t.Union[str, TaskType, None] = None,
        additional_image_properties: t.Optional[t.List[t.Dict[str, t.Any]]] = None,
        samples_per_request: int = 5000,
        label_map: t.Optional[t.Dict[int, str]] = None,
    ):
        """
        Create a vision model version and upload the reference data if provided.

        Parameters
        ----------
        model_name: str
            The model name. Can be an existing model or a name for a new model.
        version_name: str, default: 'v1'
            The version name. Version name must be unique per model.
        description: str, default: ''
            A short description of the model.
        task_type: Union[str, TaskType, None], default: None
            The task type of the model, required for creation of a new model.
            Can be inferred from 'reference_dataset.task_type' if set.
            Possible string values: 'vision_classification', 'vision_detection'
        reference_dataset: Optional[VisionData], default: None
            The reference dataset object.
        reference_predictions: Dict[int, torch.Tensor / np.ndarray]] / List[torch.Tensor / np.ndarray]], default: None
            The predictions for the reference data in format {<index>: <predictions>} or [<predictions>]. If the
            predictions are passed as a list, the order of the predictions must be the same as the order of the samples
            returned by the dataloader of the vision data. If the predictions are passed as a dictionary, the keys must
            be the indexes of the samples in the dataset from which the vision data dataloader was created.
            The model predictions for the reference data.
        additional_image_properties : List[Dict[str, Any]]
            The additional image properties to use for the reference.
            Should be in format:
                [{'name': <str>, 'method': <callable>, 'output_type': <'continuous'/'discrete'/'class_id'>}]
            See https://docs.deepchecks.com/stable/user-guide/vision/vision_properties.html for more info.
        samples_per_request: int , default 5000
            data to the server is sent by batches,
            this parameter controls batch size
        label_map : Dict[int, str], optional
            A dictionary mapping class ids to their names to be displayed in the different monitors.

        Returns
        -------
        deepchecks_client.vision.client.DeepchecksModelVersionClient
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

        if task_type is not None:
            task_type = TaskType.convert(task_type)
        else:
            task_type = TaskType.convert(reference_dataset.task_type)
            warnings.warn(
                f'Task type was inferred to be {task_type.value} based on reference dataset provided. '
                'It is recommended to provide it directly via the task_type argument. '
                'Allowed values for task_type argument are "vision_classification" and "vision_detection"'
            )

        model_client = self.get_or_create_model(model_name, task_type, description)
        version_client = model_client.version(version_name, additional_image_properties, label_map=label_map)

        version_client.upload_reference(
            vision_data=reference_dataset,
            predictions=reference_predictions,
            samples_per_request=samples_per_request
        )

        return version_client

    @docstrings
    def create_tabular_model_version(
        self,
        model_name: str,
        schema: t.Union[str, pathlib.Path, io.TextIOBase, DataSchema],
        version_name: str = 'v1',
        reference_dataset: t.Optional[Dataset] = None,
        reference_predictions: t.Optional[np.ndarray] = None,
        reference_probas: t.Optional[np.ndarray] = None,
        feature_importance: t.Union[t.Dict[str, float], 'pd.Series[float]', None] = None,
        task_type: t.Union[str, TaskType, None] = None,
        description: str = '',
        model_classes: t.Optional[t.Sequence[str]] = None,
        create_model_defaults: bool = True
    ) -> TabularModelVersionClient:
        """
        Create a tabular model version and uploads the reference data if provided.

        Parameters
        ----------
        model_name: str
            The model name. Can be an existing model or a name for a new model.
        {schema_param:2*indent}
        version_name: str, default: 'v1'
            The version name. Version name must be unique per model.
        reference_dataset: Optional[Dataset], default: None
            The reference dataset object, Required for uploading reference data.
            See https://docs.deepchecks.com/stable/user-guide/tabular/dataset_object.html for more info.
        reference_predictions: np.ndarray, default: None
            The model predictions for the reference data. Should be provided as an array of shape (n_samples,),
            containing the predicted value for each sample in the dataset. Optional if probabilities are provided.
        reference_probas: np.ndarray, default: None
            The model predicted class probabilities for the reference data, optional for classification tasks.
            Should be provided as an array of shape (n_samples, n_classes) containing the predicted probability of
            each possible class for each sample in the dataset. The classes should be ordered according to
            alphanumeric order based on the classes names.
        feature_importance: Union[Dict[str, float], pandas.Series[float], None], default: None
            a dictionary or pandas series of feature names and their feature importance value.
        task_type: Optional[str], default: None
            The task type of the model, required for creation of a new model. Can be inferred from
            dataset.label_type if set. Possible values are regression, multiclass, binary
        description: str, default: ''
            A short description of the model.
        model_classes: Optional[Sequence[str]], default: None
            List of classes used by the model. If not defined and `reference_probas` is passed, then classes are
            inferred from predictions and label.
        create_model_defaults: bool, default: True
            Whether to add default check, monitors and alerts to the model. Has no effect if the model already exists.

        Returns
        -------
        deepchecks_client.tabular.client.DeepchecksModelVersionClient
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

        schema = read_schema(schema, fail_on_invalid_column=True)
        features_dict = schema['features']

        if set(features_dict.keys()) != set(reference_dataset.features):
            raise DeepchecksValueError(
                f'Features found in reference dataset ({reference_dataset.features}) do not '
                f'match feature schema ({features_dict.keys()}).'
            )

        task_type = TaskType.convert(task_type) if task_type is not None else None

        if task_type is None and reference_dataset.label_type is not None:
            task_type = TaskType.convert(reference_dataset.label_type)
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
                    f'{len(model_classes)} model classes were provided / detected.'
                )
        elif task_type != TaskType.REGRESSION:
            warnings.warn('If predicted probabilities are not supplied, checks and metrics that rely on the predicted '
                          'probabilities (such as ROC Curve and the AUC metric) will not run.')

        version_client = self.get_or_create_model(model_name, task_type, description, create_model_defaults).version(
            version_name,
            schema=schema,
            feature_importance=feature_importance,
            model_classes=model_classes
        )

        if reference_dataset is not None:
            version_client.upload_reference(
                reference_dataset,
                prediction_probas=reference_probas,
                predictions=reference_predictions
            )

        return version_client

    def delete_model(self, model_name: str):
        """Delete a model by its name.

        Parameters
        ----------
        model_name: str
            The model to delete
        """
        self.api.delete_model_by_name(model_name)
        pretty_print(f'The following model was successfully deleted: {model_name}')

    def delete_model_version(self, model_name: str, version_name: str):
        """Delete model version by its name.

        Parameters
        ----------
        model_name: str
            The model named
        version_name: str
            The model version name
        """
        self.api.delete_model_version_by_name(model_name, version_name)
        pretty_print(f'The following model version was successfully deleted: {model_name}:{version_name}')

    @docstrings
    def add_alert_rule(
        self,
        model_name: str,
        check_name: str,
        threshold: float,
        frequency: int,
        alert_severity: str = 'mid',
        aggregation_window: t.Optional[int] = None,
        greater_than: bool = True,
        kwargs_for_check: t.Optional[t.Dict[str, t.Any]] = None,
        monitor_name: t.Optional[str] = None,
        add_monitor_to_dashboard: bool = False
    ) -> int:
        """{add_alert_rule_desc}

        Parameters
        ----------
        model_name: str
            name of the model to which the alert rule will be added
        {add_alert_rule_params:2*indent}

        Returns
        -------
        int :
            created alert rule id
        """
        model_client = self.get_or_create_model(name=model_name)
        return model_client.add_alert_rule(
            check_name=check_name,
            threshold=threshold,
            frequency=frequency,
            alert_severity=alert_severity,
            aggregation_window=aggregation_window,
            greater_than=greater_than,
            kwargs_for_check=kwargs_for_check,
            monitor_name=monitor_name,
            add_monitor_to_dashboard=add_monitor_to_dashboard
        )

    @docstrings
    def add_monitor(
        self,
        model_name: str,
        check_name: str,
        frequency: int,
        aggregation_window: t.Optional[int] = None,
        lookback: t.Optional[int] = None,
        name: t.Optional[str] = None,
        description: t.Optional[str] = None,
        add_to_dashboard: bool = True,
        kwargs_for_check: t.Optional[t.Dict[str, t.Any]] = None
    ) -> int:
        """{add_monitor_desc}

        Parameters
        ----------
        model_name: str
            name of the model to which the monitor will be added
        {add_monitor_params:2*indent}

        Returns
        -------
        int :
            created monitor id
        """
        model_client = self.get_or_create_model(name=model_name)
        return model_client.add_monitor(
            check_name=check_name,
            frequency=frequency,
            aggregation_window=aggregation_window,
            lookback=lookback,
            name=name,
            description=description,
            add_to_dashboard=add_to_dashboard,
            kwargs_for_check=kwargs_for_check
        )
