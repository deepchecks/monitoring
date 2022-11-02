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
import os
import typing as t
import warnings

try:
    from importlib import metadata
except ImportError: # for Python<3.8
    import importlib_metadata as metadata

from typing import Dict, Optional
from urllib.parse import urljoin

import numpy as np
import pandas as pd
import pendulum as pdl
import requests
import certifi
from deepchecks.core.checks import BaseCheck
from deepchecks.core.errors import DeepchecksValueError
from deepchecks.core.reduce_classes import ReduceMixin
from deepchecks.tabular import Dataset
from deepchecks_client.core.utils import DeepchecksJsonValidator, TaskType, maybe_raise, parse_timestamp, pretty_print
from deepchecks_client.tabular.utils import read_schema

__all__ = ['DeepchecksClient']
__version__ = metadata.version("deepchecks_client")


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
        return super().request(method,
                               url,
                               *args,
                               headers=headers,
                               verify=certifi.where(),
                               **kwargs)


class DeepchecksModelVersionClient:
    """Client to interact with a given model version, including all functions to send data.

    Parameters
    ----------
    model_version_id: int
        The id of the model version.
    model: dict
    session: requests.Session
    """

    model_version_id: int
    schema: dict
    ref_schema: dict
    _log_samples: list
    _update_samples: list

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
        self._update_samples = []

        schemas = maybe_raise(
            self.session.get(f'model-versions/{model_version_id}/schema'),
            msg=f"Failed to obtain ModelVersion(id:{model_version_id}) schema.\n{{error}}"
        ).json()

        self.schema = schemas['monitor_schema']
        self.ref_schema = schemas['reference_schema']

        self.categorical_columns = [feat for feat, value in
                                     dict(schemas['features'], **schemas['non_features']).items()
                                     if value == 'categorical']

        self.schema_validator = DeepchecksJsonValidator(self.schema)
        self.ref_schema_validator = DeepchecksJsonValidator(self.ref_schema)

    def log_sample(self, *args, **kwargs):
        """Send sample for the model version."""
        raise NotImplementedError

    def send(self):
        """Send all the aggregated samples for upload or update."""
        if len(self._log_samples) > 0:
            maybe_raise(
                self.session.post(
                    f'model-versions/{self.model_version_id}/data',
                    json=self._log_samples
                ),
                msg="Samples upload failure.\n{error}"
            )
            self._log_samples.clear()

        if len(self._update_samples) > 0:
            maybe_raise(
                self.session.put(
                    f'model-versions/{self.model_version_id}/data',
                    json=self._update_samples
                ),
                msg="Samples update failure.\n{error}"
            )
            self._update_samples.clear()

    def upload_reference(self, *args, **kwargs):
        """Upload reference data. Possible to upload only once for a given model version."""
        raise NotImplementedError

    def _upload_reference(
            self,
            data: pd.DataFrame,
            samples_per_request: int = 5000,
    ):
        for i in range(0, len(data), samples_per_request):
            content = data.iloc[i:i + samples_per_request]
            maybe_raise(
                self.session.post(
                    f'model-versions/{self.model_version_id}/reference',
                    files={'batch': content.to_json(orient='table', index=False)}
                ),
                msg="Reference batch upload failure.\n{error}"
            )

    def update_sample(self, sample_id: str, label=None, **values):
        """Update sample. Possible to update only non_features and label."""
        raise NotImplementedError

    def time_window_statistics(self, start_time: t.Union[pdl.datetime, int, None] = None,
                               end_time: t.Union[pdl.datetime, int, None] = None) -> t.Dict[str, float]:
        """Get statistics on samples in a provided time window.

        Parameters
        ----------
        start_time: Union[datetime, int], default = None
            The start time of the time window. If no timezone info is provided on the datetime assumes local timezone.
        end_time: Union[datetime, int], default = None
            The end time of the time window. If no timezone info is provided on the datetime assumes local timezone.

        Returns
        -------
        statistics: dict
            A dictionary containing the statistics.
        """
        start_time = parse_timestamp(start_time) if start_time is not None else pdl.datetime(1970, 1, 1)
        end_time = parse_timestamp(end_time) if end_time is not None else pdl.now()

        response = maybe_raise(
            self.session.post(
                url=f'model-versions/{self.model_version_id}/time-window-statistics',
                json={'start_time': start_time.isoformat(), 'end_time': end_time.isoformat()}
            ),
            msg="Failed to get statistics for samples within provided time window.\n{error}"
        )
        return response.json()


class DeepchecksModelClient:
    """Client to interact with a model in monitoring.

    Parameters
    ----------
    session: requests.Session
        The deepchecks monitoring API session.
    model_id: int
        The id of the model.
    """

    def __init__(self, model_id: int, session: requests.Session):
        self.session = session
        self.model = maybe_raise(
            self.session.get(f'models/{model_id}'),
            msg=f"Failed to obtain Model(id:{model_id}).\n{{error}}"
        ).json()
        self._model_version_clients = {}

    def version(self, *args, **kwargs) -> DeepchecksModelVersionClient:
        """Get or create a new model version."""
        raise NotImplementedError

    def _get_existing_version_id_or_none(self, version_name: str, **kwargs):
        """Get a model version if it exists, otherwise return None."""
        existing_versions = maybe_raise(
            self.session.get(f'models/{self.model["id"]}/versions'),
            msg=f"Failed to retrieve existing versions for model id {self.model['id']}. \n{{error}}"
        ).json()
        if version_name in [v['name'] for v in existing_versions]:
            existing_version = [v for v in existing_versions if v['name'] == version_name][0]
            # TODO: add validations of existing version params vs received params
            return existing_version['id']
        else:
            return

    def _get_model_version_id(self, model_version_name):
        versions = self.get_versions()
        return versions.get(model_version_name)

    def _version_client(self) -> DeepchecksModelVersionClient:
        """Get client to interact with a given version of the model."""
        raise NotImplementedError

    def _add_defaults(self) -> t.Dict[str, int]:
        """Add default checks, monitors and alerts to the model based on its task type."""
        raise NotImplementedError

    def add_checks(self, checks: t.Dict[str, BaseCheck], force_replace: bool = False) -> t.Dict[str, int]:
        """Add new checks for the model and returns their checks' id."""
        serialized_checks = []

        checks_in_model = self.get_checks()
        for name, check in checks.items():
            if not isinstance(check, ReduceMixin):
                raise TypeError('Checks that do not implement "ReduceMixin" are not supported')
            elif name in checks_in_model and not force_replace:
                warnings.warn(f'Check named {name} already exist, was not modified. If you want to change it'
                              f'set the force_replace argument to true')
            elif name in checks_in_model and force_replace:
                warnings.warn(f'Check named {name} already exist, was modified to newly added check.')
                raise Exception("Currently unsupported")
            else:
                serialized_checks.append({'name': name, 'config': check.config()})

        response = maybe_raise(
            self.session.post(
                url=f'models/{self.model["id"]}/checks',
                json=serialized_checks
            ),
            msg="Failed to create new check instances.\n{error}"
        )
        return {serialized_checks[idx]['name']: int(d['id']) for idx, d in enumerate(response.json())}

    def _get_id_of_check(self, check_name: str) -> int:
        """ Return the check id of a provided check name."""
        model_id = self.model["id"]
        data = maybe_raise(
            self.session.get(f'models/{self.model["id"]}/checks'),
            msg=f"Failed to obtain Model(id:{model_id}) checks.\n{{error}}").json()

        for check in data:
            if check['name'] == check_name:
                return check['id']
        return None

    def get_checks(self) -> t.Dict[str, BaseCheck]:
        """Return dictionary of check instances."""
        model_id = self.model["id"]

        data = maybe_raise(
            self.session.get(f'models/{self.model["id"]}/checks'),
            msg=f"Failed to obtain Model(id:{model_id}) checks.\n{{error}}"
        ).json()

        if not isinstance(data, list):
            raise ValueError('Expected server to return a list of check configs.')

        return {it['name']: BaseCheck.from_config(it['config']) for it in data}

    def add_alert_rule_on_existing_monitor(self, monitor_id: int, threshold: float, alert_severity: str = "mid",
                                           greater_than: bool = True) -> int:
        """Create an alert based on an existing monitor.

        Parameters
        ----------
        monitor_id: int
            The monitor on which we wise to add an alert.
        threshold: float
            The value to compare the check value to.
        alert_severity: str, default: "mid"
            The severity level associated with the alert. Possible values are: critical, high, mid and low.
        greater_than: bool, default: True
            Whether the alert condition requires the check value to be larger or smaller than provided threshold.

        Returns
        -------
            alert_id: int
        """
        if alert_severity not in ['low', 'mid', 'high', 'critical']:
            raise Exception(f'Alert severity must be of one of low, mid, high, critical received {alert_severity}.')

        response = maybe_raise(
            self.session.post(
                url=f'monitors/{monitor_id}/alert-rules', json={
                    'condition': {'operator': "greater_than" if greater_than else "less_than",
                                  'value': threshold},
                    'alert_severity': alert_severity,
                }), msg="Failed to create new alert for check.\n{error}")
        return response.json()['id']

    def add_alert_rule(self, check_name: str, threshold: float, frequency: int, alert_severity: str = "mid",
                       aggregation_window: int = None, greater_than: bool = True, kwargs_for_check: t.Dict = None,
                       monitor_name: str = None, add_monitor_to_dashboard: bool = False) -> int:
        """Create an alert based on provided arguments. Alert is run on a specific check result.
        Parameters
        ----------
        check_name: str
            The check to monitor. The alert will monitor the value produced by the check's reduce function.
        threshold: float
            The value to compare the check value to.
        frequency: int, default: None
            Control the frequency the alert will be calculated, provided in seconds.
        aggregation_window: int
            The time range (current time - window size) the check would run on, provided in seconds.
            If None, uses window size as frequency.
        alert_severity: str, default: "mid"
            The severity level associated with the alert. Possible values are: critical, high, mid and low.
        greater_than: bool, default: True
            Whether the alert condition requires the check value to be larger or smaller than provided threshold.
        kwargs_for_check: t.Dict, default = None
            Additional kwargs to pass on to check.
        monitor_name: str, default: None
            Name for the created monitor.
        add_monitor_to_dashboard: bool, default: False
            Whether to add a corresponding monitor to the dashboard screen.

        Returns
        -------
            alert_id: int
        """
        if alert_severity not in ['low', 'mid', 'high', 'critical']:
            raise Exception(f'Alert severity must be of one of low, mid, high, critical received {alert_severity}.')

        monitor_id = self.add_monitor(check_name=check_name, frequency=frequency, aggregation_window=aggregation_window,
                                      name=monitor_name, kwargs_for_check=kwargs_for_check,
                                      add_to_dashboard=add_monitor_to_dashboard)
        return self.add_alert_rule_on_existing_monitor(monitor_id=monitor_id, threshold=threshold,
                                                       alert_severity=alert_severity, greater_than=greater_than)

    def add_monitor(self, check_name: str, frequency: int, aggregation_window: int = None, lookback: int = None,
                    name: str = None, description: str = None, add_to_dashboard: bool = True,
                    kwargs_for_check: t.Dict = None) -> int:
        """Create a monitor based on check to be displayed in dashboard.
        Parameters
        ----------
        check_name: str
            The check to monitor. The alert will monitor the value produced by the check's reduce function.
        frequency: int
            How often the minitor would be calculated, provided in seconds.
        aggregation_window: int, default: None
            The aggregation window of each calculation of the minitor, provided in seconds.
        lookback: int, default: None
            Determines the time range seen on the monitor, provided in seconds.
        name: str, default: None
            The name to assigned to the monitor.
        description: str, default: None
            The description to assigned to the monitor.
        add_to_dashboard: bool, default: True
            Whether to add the monitor to the dashboard screen.
        kwargs_for_check: t.Dict, default = None
            Additional kwargs to pass on to check.

        Returns
        -------
            monitor_id: int
        """
        check_id = self._get_id_of_check(check_name)
        response = maybe_raise(
            self.session.post(
                url=f'checks/{check_id}/monitors', json={
                    'name': name if name is not None else f'{check_name} Monitor',
                    'lookback': frequency * 12 if lookback is None else lookback,
                    'frequency': frequency,
                    'aggregation_window': frequency if aggregation_window is None else aggregation_window,
                    'dashboard_id': self.session.get('dashboards/').json()['id'] if add_to_dashboard else None,
                    'description': description,
                    'additional_kwargs': kwargs_for_check
                }), msg="Failed to create new monitor for check.\n{error}")
        return response.json()['id']

    def get_versions(self) -> t.Dict[str, str]:
        """Return list of model version (id and name)."""
        model_id = self.model["id"]

        model_versions = maybe_raise(
            self.session.get(f'models/{self.model["id"]}/versions'),
            msg=f"Failed to obtain Model(id:{model_id}) checks.\n{{error}}"
        ).json()

        if not isinstance(model_versions, list):
            raise ValueError('Expected server to return a list of model versions.')

        return {model_version['name']: model_version['id'] for model_version in model_versions}

    def delete_checks(self, names: t.List[str]):
        model_id = self.model["id"]
        checks_not_in_model = [x for x in names if x not in self.get_checks().keys()]
        if len(checks_not_in_model) > 0:
            warnings.warn(f'The following checks do not exist in model: {checks_not_in_model}')

        checks_in_model = [x for x in names if x not in checks_not_in_model]
        maybe_raise(
            self.session.delete(
                f'models/{model_id}/checks',
                params={'names': checks_in_model}
            ),
            msg=f"Failed to drop Model(id:{model_id}) checks.\n{{error}}"
        )
        pretty_print(f"The following checks were successfully deleted: {checks_in_model}")


class DeepchecksClient:
    """Client to interact with deepchecks monitoring.

    Parameters
    ----------
    host: str
        The deepchecks monitoring API host.
    token: Optional[str]
        The deepchecks API token
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
            task_type: Optional[str] = None,
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
        available_models = maybe_raise(
            self.session.get('models'),
            msg="Failed to retrieve existing models from session.\n{error}"
        ).json()

        if name in [model['name'] for model in available_models]:
            model = [model for model in available_models if model['name'] == name][0]
            if task_type is not None and task_type != model['task_type']:
                raise ValueError(f'Model with name {name} already exists, but has different task type.')
            if description is not None and description != model['description']:
                raise ValueError(f'Model with name {name} already exists, but has different description.')
            return self._model_client(model['id'], model['task_type'])

        if task_type is None:
            raise ValueError(f'task_type must be provided for creation of a new model')
        elif task_type not in TaskType.values():
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
        msg = f"Model {name} was successfully created!."
        if create_defaults:
            model._add_defaults()
            msg += " Default checks, monitors and alerts added."
        pretty_print(msg)

        return model

    def _model_client(self, model_id: int, task_type: str) -> DeepchecksModelClient:
        """Get client to interact with a specific model.

        Parameters
        ----------
        model_id: int
            Model id to get client for.
        task_type: str
            Task type of the model, possible values are regression, multiclass, binary, vision_classification and
            vision_detection.

        Returns
        -------
        DeepchecksModelClient
            Client to interact with the model.
        """
        if self._model_clients.get(model_id) is None:
            if 'vision' in task_type:
                from deepchecks_client.vision.client import DeepchecksModelClient as VisionDeepchecksModelClient
                self._model_clients[model_id] = VisionDeepchecksModelClient(model_id, session=self.session)
            else:
                from deepchecks_client.tabular.client import DeepchecksModelClient as TabularDeepchecksModelClient
                self._model_clients[model_id] = TabularDeepchecksModelClient(model_id, session=self.session)
        return self._model_clients[model_id]

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
        available_models = maybe_raise(
            self.session.get('models'),
            msg="Failed to retrieve existing models from session.\n{error}"
        ).json()

        if model_name not in [model['name'] for model in available_models]:
            raise ValueError(f'Model with name {model_name} does not exist.')
        model = self.model(model_name)

        existing_version_id = model._get_existing_version_id_or_none(version_name=version_name)
        if existing_version_id is None:
            raise ValueError(f'Model {model_name} does not have a version with name {version_name}.')
        else:
            return model.version(version_name)

    def create_tabular_model_version(self,
                                     model_name: str,
                                     schema_file,
                                     version_name: str = 'v1',
                                     reference_dataset: Optional[Dataset] = None,
                                     reference_predictions: Optional[np.ndarray] = None,
                                     reference_probas: Optional[np.ndarray] = None,
                                     feature_importance: Optional[Dict[str, float]] = None,
                                     task_type: Optional[str] = None,
                                     description: str = ''
                                     ) -> 'tabular.client.DeepchecksModelVersionClient':
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

        Returns
        -------
        tabular.client.DeepchecksModelVersionClient
            Return the created model version client.
        """
        try:
            model_version = self.get_model_version(model_name=model_name, version_name=version_name)
            raise AssertionError(f'Model {model_name} already has a version named {version_name}. '
                                 f'Use get_model_version to retrieve it or create a new version with a different name.')
        except ValueError:
            pass

        schema = read_schema(schema_file)
        features_dict, non_features_dict = schema['features'], schema['non_features']
        if set(features_dict.keys()) != set(reference_dataset.features):
            raise DeepchecksValueError(f'Features found in reference dataset ({reference_dataset.features}) do not '
                                       f'match feature schema ({features_dict.keys()}).')

        if task_type is None and reference_dataset.label_type is not None:
            task_type = reference_dataset.label_type
            warnings.warn(f'Task type was inferred to be {task_type} based on reference dataset provided. '
                          f'It is recommended to provide it directly via the task_type argument.')

        version_client = self.model(model_name, task_type, description) \
            .version(version_name, features=features_dict, non_features=non_features_dict,
                     feature_importance=feature_importance)

        if reference_dataset is not None:
            version_client.upload_reference(reference_dataset,
                                            prediction_probas=reference_probas,
                                            predictions=reference_predictions)
            pretty_print('Reference data uploaded.')

        return version_client

    def delete_model(self, model_name: str):
        """Delete a model by its name.

        Parameters
        ----------
        model_name: str
            The model to delete
        """
        available_models = maybe_raise(
            self.session.get('models'),
            msg="Failed to retrieve existing models from session.\n{error}"
        ).json()

        if model_name in [model['name'] for model in available_models]:
            model_id = [model['id'] for model in available_models if model['name'] == model_name][0]
        else:
            raise ValueError(f'Model {model_name} does not exist.')

        maybe_raise(
            self.session.delete(
                f'models/{model_id}'
            ),
            msg=f"Failed to drop Model(id:{model_id}).\n{{error}}"
        )
        pretty_print(f"The following model was successfully deleted: {model_name}")
