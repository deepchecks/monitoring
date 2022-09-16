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
import warnings
from importlib.metadata import version
from urllib.parse import urljoin

import requests
from deepchecks.core.checks import BaseCheck
from deepchecks.core.reduce_classes import ReduceMixin
from deepchecks_client.core.utils import maybe_raise

__all__ = ['DeepchecksClient', 'ColumnType', 'TaskType', 'DeepchecksColumns']
__version__ = version("deepchecks_client")


class TaskType(enum.Enum):
    """Enum containing supported task types."""

    REGRESSION = "regression"
    MULTICLASS = "multiclass"
    BINARY = "binary"
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
    model_version_id: int
        The id of the model version.
    model: dict
    session: requests.Session
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

    def log_sample(self, *args, **kwargs):
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

    def upload_reference(self, *args, **kwargs):
        """Upload reference data. Possible to upload only once for a given model version."""
        raise NotImplementedError

    def update_sample(self, sample_id: str, label=None, **values):
        """Update sample. Possible to update only non_features and label."""
        raise NotImplementedError


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
            msg=f"Failed to obtaine Model(id:{model_id}).\n{{error}}"
        ).json()
        self._model_version_clients = {}

    def version(self, *args, **kwargs) -> DeepchecksModelVersionClient:
        """Get or create a new model version."""
        raise NotImplementedError

    def _get_model_version_id(self, model_version_name):
        versions = self.get_versions()
        return versions.get(model_version_name)

    def _version_client(self) -> DeepchecksModelVersionClient:
        """Get client to interact with a given version of the model."""
        raise NotImplementedError

    def _add_default_checks(self) -> t.Dict[str, int]:
        """Add default checks to the model based on its task type."""
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

    def add_alert(self, check_name: str, threshold: float, window_size: int, alert_severity: str = "mid",
                  repeat_every: int = None, greater_than: bool = True, alert_name: str = None,
                  monitor_name: str = None, add_monitor_to_dashboard: bool = False) -> int:
        """Create an alert based on provided arguments. Alert is run on a specific check result.
        Parameters
        ----------
        check_name: str
            The check to monitor. The alert will monitor the value produced by the check's reduce function.
        threshold: float
            The value to compare the check value to.
        window_size: int
            The time range (current time - window size) the check would run on, provided in seconds.
        alert_severity: str, default: "mid"
            The severity level associated with the alert. Possible values are: critical, high, mid and low.
        repeat_every: int, default: None
            Control the frequency the alert will be calculated. If None, uses window size as frequency.
        greater_than: bool, default: True
            Whether the alert condition requires the check value to be larger or smaller than provided threshold.
        alert_name: str, default: None
            Name for the created alert.
        monitor_name: str, default: None
            Name for the created monitor (only relevant if add_monitor_to_dashboard is True).
        add_monitor_to_dashboard: bool, default: False
            Whether to add a corresponding monitor to the dashboard screen.
        Returns
        -------
            alert_id: int
        """

        if alert_severity not in ['low', 'mid', 'high', 'critical']:
            raise Exception(f'Alert severity must be of one of low, mid, high, critical received {alert_severity}.')

        monitor_name = monitor_name if monitor_name is not None else f'{check_name} alert monitor'
        monitor_id = self.add_monitor(check_name=check_name, lookback=window_size * 12, name=monitor_name,
                                      add_to_dashboard=add_monitor_to_dashboard)
        response = maybe_raise(
            self.session.post(
                url=f'monitors/{monitor_id}/alert-rules', json={
                    'condition': {'operator': "greater_than" if greater_than else "less_than",
                                  'value': threshold},
                    'repeat_every': repeat_every if repeat_every is not None else window_size,
                    'alert_severity': alert_severity,
                    'name': alert_name
                }), msg="Failed to create new alert for check.\n{error}")
        return response.json()['id']

    def add_monitor(self, check_name: str, lookback: int, name: str = None, description: str = None,
                    add_to_dashboard: bool = True) -> int:
        """Create a monitor based on check to be displayed in dashboard.
        Parameters
        ----------
        check_name: str
            The check to monitor. The alert will monitor the value produced by the check's reduce function.
        lookback: int
            The time range to minitor, provided in seconds.
        name: str, default: None
            The name to assigned to the monitor.
        description: str, default: None
            The description to assigned to the monitor.
        add_to_dashboard: bool, default: True
            Whether to add the monitor to the dashboard screen.
        Returns
        -------
            monitor_id: int
        """
        check_id = self._get_id_of_check(check_name)
        response = maybe_raise(
            self.session.post(
                url=f'checks/{check_id}/monitors', json={
                    'name': name if name is not None else f'{check_name} Monitor',
                    'lookback': lookback,
                    'dashboard_id': self.session.get('dashboards/').json()['id'] if add_to_dashboard else None,
                    'description': description,
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
    token
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
            Task type of the model, one of the values in TaskType
        description
            Additional description for the model
        checks

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

        if len(model.get_checks()) == 0 and checks is None:
            model._add_default_checks()
        elif checks is not None:
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
                self._model_clients[model_id] = VisionDeepchecksModelClient(model_id, session=self.session)
            else:
                self._model_clients[model_id] = TabularDeepchecksModelClient(model_id, session=self.session)
        return self._model_clients[model_id]
