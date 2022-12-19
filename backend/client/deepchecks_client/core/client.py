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
"""Module containing deepchecks monitoring client."""
import typing as t
import warnings
from datetime import datetime

import pandas as pd
import pendulum as pdl
from deepchecks.core.checks import BaseCheck
from deepchecks.core.reduce_classes import ReduceMixin
from deepchecks_client._shared_docs import docstrings
from deepchecks_client.core.utils import (DataFilter, DeepchecksColumns, DeepchecksEncoder, DeepchecksJsonValidator,
                                          TaskType, parse_timestamp, pretty_print)

from .api import API

if t.TYPE_CHECKING:
    from pendulum.datetime import DateTime as PendulumDateTime  # pylint: disable=unused-import

__all__ = ['DeepchecksModelVersionClient', 'DeepchecksModelClient', 'MAX_REFERENCE_SAMPLES']


MAX_REFERENCE_SAMPLES = 100_000


class DeepchecksModelVersionClient:
    """Client to interact with a given model version, including all functions to send data.

    Parameters
    ----------
    model_version_id : int
        The id of the model version.
    model : dict
        The model
    api : core.API
        The instance of the API object
    """

    api: API
    model: t.Dict[str, t.Any]
    model_version_id: int

    def __init__(
            self,
            model_version_id: int,
            model: t.Dict[str, t.Any],
            api: API,
    ):
        self.api = api
        self.model = model
        self.model_version_id = model_version_id
        self.task_type = TaskType(self.model['task_type'])
        self._log_samples = []
        self._update_samples = []

        schemas = t.cast(t.Dict[str, t.Any], self.api.fetch_model_version_schema(model_version_id))
        self.schema = schemas['monitor_schema']
        self.ref_schema = schemas['reference_schema']
        self.model_classes = schemas['classes']
        self.features: t.Dict[str, str] = schemas['features']
        self.additional_data: t.Dict[str, str] = schemas['additional_data']
        self.feature_importance = schemas['feature_importance']
        self.label_map = schemas['label_map']
        self.all_columns = {**self.features, **self.additional_data}

        self.schema_validator = DeepchecksJsonValidator(self.schema)
        self.ref_schema_validator = DeepchecksJsonValidator(self.ref_schema)

        sample_id_column = DeepchecksColumns.SAMPLE_ID_COL.value
        label_column = DeepchecksColumns.SAMPLE_LABEL_COL.value

        self.update_record_validator = DeepchecksJsonValidator({
            'type': 'object',
            'required': [sample_id_column],
            'properties': {
                sample_id_column: self.schema['properties'][sample_id_column],
                label_column: self.schema['properties'][label_column]
            },
        })

        self.features = schemas['features']
        self.additional_data = schemas['additional_data']
        self.all_columns = {
            **self.features,
            **self.additional_data
        }
        self.categorical_columns = [
            feat
            for feat, value in self.all_columns.items()
            if value == 'categorical'
        ]

    def log_sample(self, *args, **kwargs):
        """Add a data sample for the model version update queue. Requires a call to send() to upload.

        Parameters
        ----------
        *args
            The args.
        *kwargs
            The kwargs.
        """
        raise NotImplementedError

    def log_batch(self, *args, **kwargs):
        """Log a batch of samples.

        Parameters
        ----------
        *args
            The args.
        *kwargs
            The kwargs.
        """
        raise NotImplementedError

    def send(self, samples_per_send: int = 10_000):
        """Send all the aggregated samples for upload or update.

        Parameters
        ==========
        samples_per_send : int , default 10_000
            how many samples to send by one request
        """
        if len(self._log_samples) > 0:
            for i in range(0, len(self._log_samples), samples_per_send):
                self.api.upload_samples(
                    self.model_version_id,
                    self._log_samples[i: i+samples_per_send]
                )

            pretty_print(f'{len(self._log_samples)} new samples were successfully logged.')
            self._log_samples.clear()

        if len(self._update_samples) > 0:
            for i in range(0, len(self._update_samples), samples_per_send):
                self.api.update_samples(
                    self.model_version_id,
                    self._update_samples[i: i+samples_per_send]
                )

            pretty_print(f'{len(self._update_samples)} samples were successfully updated.')
            self._update_samples.clear()

    def upload_reference(self, *args, **kwargs):
        """Upload reference data. Possible to upload only once for a given model version.

        Parameters
        ----------
        *args
            The args.
        *kwargs
            The kwargs.
        """
        raise NotImplementedError

    def _upload_reference(
            self,
            data: pd.DataFrame,
            samples_per_request: int = 5000,
    ):
        for i in range(0, len(data), samples_per_request):
            content = data.iloc[i:i + samples_per_request]
            self.api.upload_reference(self.model_version_id, content.to_json(orient='table', index=False))

    def update_sample(
        self,
        sample_id: str,
        label: t.Any,
    ):
        """Update an existing sample.

        Adds the sample to the update queue.
        Requires a call to send() to upload.

        Parameters
        ----------
        sample_id : str
            The sample id.
        label: Any
            label of the sample
        """
        if self.task_type in {TaskType.MULTICLASS, TaskType.BINARY}:
            label = str(label)
        elif self.task_type == TaskType.REGRESSION:
            label = float(label)
        elif self.task_type in TaskType.vision_types():
            pass
        else:
            raise ValueError('Unknown model type - {self.task_type}')

        sample = {DeepchecksColumns.SAMPLE_ID_COL: str(sample_id), DeepchecksColumns.SAMPLE_LABEL_COL: label}
        sample = t.cast(t.Dict[str, t.Any], DeepchecksEncoder.encode(sample))
        self.update_record_validator.validate(sample)
        self._update_samples.append(sample)

    def update_batch(
        self,
        sample_ids: t.Sequence[str],
        labels: t.Sequence[t.Any],
        samples_per_send: int = 10_000
    ):
        """Update samples labels.

        Any previously appended samples will be send to the server.

        Important to understand that updated labels are not used in alerts
        calculation if update happened after "alert delay window" and that
        they also do not trigger alerts recalculation.

        TODO:
        - add link to documentation explaining "alert delay window"

        Parameters
        ==========
        sample_ids : Sequence[str]
            A sequence of sample ids of already uploaded samples whose labels we wish to modify.
        labels : Sequence[Any]
            A sequence of sample labels.
        samples_per_send: int , default 10_000
            how many samples to send by one request
        """
        if len(sample_ids) == 0:
            raise ValueError('"sample_ids" array cannot be empty')

        if len(labels) != len(sample_ids):
            raise ValueError('length of "labels" array must be equal to length of "sample_ids" array')

        for sample_id, label in zip(sample_ids, labels):
            self.update_sample(sample_id=sample_id, label=label)

        self.send(samples_per_send)

    def time_window_statistics(
        self,
        start_time: t.Union['PendulumDateTime', int, None] = None,
        end_time: t.Union['PendulumDateTime', int, None] = None
    ) -> t.Dict[str, float]:
        """Get statistics on uploaded samples for the model version in a provided time window.

        Parameters
        ----------
        start_time : Union[PendulumDateTime, int, None], default = None
            The start time of the time window. If no timezone info is provided on the datetime assumes local timezone.
        end_time : Union[PendulumDateTime, int, None], default = None
            The end time of the time window. If no timezone info is provided on the datetime assumes local timezone.

        Returns
        -------
        dict
            A dictionary containing the statistics.
        """
        start_time = parse_timestamp(start_time) if start_time is not None else pdl.datetime(1970, 1, 1)
        end_time = parse_timestamp(end_time) if end_time is not None else pdl.now()
        return t.cast(
            t.Dict[str, t.Any],
            self.api.fetch_model_version_time_window_statistics(
                self.model_version_id,
                start_time.isoformat(),
                end_time.isoformat()
            )
        )

    def validate(self, features=None, additional_data=None, feature_importance=None, model_classes=None,
                 label_map=None):
        """Used in create version when the version already exists to verify it's matching the user passed properties."""
        if features:
            if self.features != features:
                raise ValueError('Existing model version does not match received features columns')
        if additional_data:
            if self.additional_data != additional_data:
                raise ValueError('Existing model version does not match received additional data columns')
        if feature_importance:
            if self.feature_importance != feature_importance:
                raise ValueError('Existing model version does not match received feature importance')
        if model_classes:
            if self.model_classes != model_classes:
                raise ValueError('Existing model version does not match received model classes')
        if label_map:
            if self.label_map != label_map:
                raise ValueError('Existing model version does not match received label_map')

    def get_reference_data(
        self,
        rows_count: int = 10_000,
        filters: t.List[DataFilter] = None,
    ) -> pd.DataFrame:
        """Get the reference data.

        Parameters
        ----------
        model_version_id : int
            The model version id.
        rows_count : int, optional
            The number of rows to return (random sampling will be used).
        filters : t.List[DataFilter], optional
            Data filters to apply. Used in order to received a segment of the data based on selected properties.
            Required format for filters and possible operators are detailed under the respected objects
            which can be found at:
            `from deepchecks_client import DataFilter, OperatorsEnum`

        Returns
        -------
        'pandas'.DataFrame
            The reference data.
        """
        return self.api.get_model_version_reference_data(self.model_version_id, rows_count, filters)

    def get_production_data(
        self,
        start_time: t.Union[datetime, str, int],
        end_time: t.Union[datetime, str, int],
        rows_count: int = 10_000,
        filters: t.List[DataFilter] = None,
    ) -> pd.DataFrame:
        """Get the production data on a specific window.

        Parameters
        ----------
        model_version_id : int
            The model version id.
        start_time : t.Union[datetime, str, int]
            The start time timestamp.
                - int: Unix timestamp
                - str: timestamp in ISO8601 format
                - datetime: If no timezone info is provided on the datetime assumes local timezone.
        end_time : t.Union[datetime, str, int]
            The end time timestamp.
                - int: Unix timestamp
                - str: timestamp in ISO8601 format
                - datetime: If no timezone info is provided on the datetime assumes local timezone.
        rows_count : int, optional
            The number of rows to return (random sampling will be used).
        filters : t.List[DataFilter], optional
            Data filters to apply. Used in order to received a segment of the data based on selected properties.
            Required format for filters and possible operators are detailed under the respected objects
            which can be found at:
            `from deepchecks_client import DataFilter, OperatorsEnum`

        Returns
        -------
        'pandas'.DataFrame
            The production data.
        """
        return self.api.get_model_version_production_data(self.model_version_id,
                                                          start_time, end_time,
                                                          rows_count, filters)


class DeepchecksModelClient:
    """Client to interact with a model in monitoring. Created via the DeepchecksClient's get_or_create_model function.

    Parameters
    ----------
    model : Dict[str, Any]
        Name of the model.
    api : deepchecks_client.core.api.API
        The instance of the API object
    """

    @classmethod
    def create_from_name(cls, model_name: str, api: API):
        """Request model instance by name and and create a model client from it."""
        return cls(
            model=t.cast(t.Dict[str, t.Any], api.fetch_model_by_name(model_name)),
            api=api,
        )

    @classmethod
    def create_from_id(cls, model_id: int, api: API):
        """Request model instance by ID and and create a model client from it."""
        return cls(
            model=t.cast(t.Dict[str, t.Any], api.fetch_model_by_id(model_id)),
            api=api,
        )

    def __init__(
        self,
        model: t.Dict[str, t.Any],
        api: API
    ):
        self.api = api
        self.model = model
        self._model_version_clients = {}

    def version(self, *args, **kwargs) -> DeepchecksModelVersionClient:
        """Get or create a new model version.

        Parameters
        ----------
        *args
            The args.
        *kwargs
            The kwargs.

        Returns
        -------
        DeepchecksModelVersionClient
            The model version client.
        """
        raise NotImplementedError

    def _get_existing_version_id_or_none(self, version_name: str) -> int:
        """Get a model version if it exists, otherwise return None.

        Parameters
        ----------
        version_name : str
            The version name.

        Returns
        -------
        int
            The version ID.
        """
        versions = self.api.fetch_all_model_versions(self.model['id'])
        versions = t.cast(t.List[t.Dict[str, t.Any]], versions)
        for it in versions:
            if it['name'] == version_name:
                return it['id']

    def _version_client(self) -> DeepchecksModelVersionClient:
        """Get client to interact with a given version of the model."""
        raise NotImplementedError

    def _add_defaults(self) -> t.Dict[str, int]:
        """Add default checks, monitors and alerts to the model based on its task type."""
        raise NotImplementedError

    def add_checks(self, checks: t.Dict[str, BaseCheck], force_replace: bool = False):
        """Add new checks for the model and returns their checks' id.

        Parameters
        ----------
        checks : dict
            The checks to be added.
        force_replace : bool, default=False
            If True, replace existing checks.

        Returns
        -------
        dict
            The checks' ids.
        """
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
                raise Exception('Currently unsupported')
            else:
                serialized_checks.append({'name': name, 'config': check.config()})

        self.api.create_checks(self.model['id'], serialized_checks)

    def _get_id_of_check(self, check_name: str) -> t.Optional[int]:
        """Return the check id of a provided check name."""
        checks = self.api.fetch_all_model_checks_by_id(self.model['id'])
        checks = t.cast(t.List[t.Dict[str, t.Any]], checks)
        for check in checks:
            if check['name'] == check_name:
                return check['id']

    def get_checks(self) -> t.Dict[str, BaseCheck]:
        """Return dictionary of check instances.

        Returns
        -------
        dict
            The checks.
        """
        checks = self.api.fetch_all_model_checks_by_id(self.model['id'])
        checks = t.cast(t.List[t.Dict[str, t.Any]], checks)
        return {it['name']: BaseCheck.from_config(it['config']) for it in checks}

    def add_alert_rule_on_existing_monitor(
        self,
        monitor_id: int,
        threshold: float,
        alert_severity: str = 'mid',
        greater_than: bool = True
    ) -> int:
        """Create an alert based on an existing monitor.

        Parameters
        ----------
        monitor_id : int
            The monitor on which we wise to add an alert.
        threshold : float
            The value to compare the check value to.
        alert_severity : str, default: "mid"
            The severity level associated with the alert. Possible values are: critical, high, mid and low.
        greater_than : bool, default: True
            Whether the alert condition requires the check value to be larger or smaller than provided threshold.

        Returns
        -------
        int
            The alert id.
        """
        if alert_severity not in {'low', 'mid', 'high', 'critical'}:
            raise ValueError(
                'Alert severity must be of one of low, mid, '
                f'high, critical received {alert_severity}.'
            )

        rule = self.api.create_alert_rule(
            monitor_id=monitor_id,
            alert_rule={
                'alert_severity': alert_severity,
                'condition': {
                    'operator': ('greater_than' if greater_than else 'less_than'),
                    'value': threshold
                }
            }
        )

        rule = t.cast(t.Dict[str, t.Any], rule)
        return rule['id']

    @docstrings
    def add_alert_rule(
        self,
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
        {add_alert_rule_params:1*indent}

        Returns
        -------
        int
            The alert rule ID.
        """
        if alert_severity not in {'low', 'mid', 'high', 'critical'}:
            raise ValueError(
                'Alert severity must be of one of low, mid, '
                f'high, critical received {alert_severity}.'
            )
        monitor_id = self.add_monitor(
            check_name=check_name,
            frequency=frequency,
            aggregation_window=aggregation_window,
            name=monitor_name,
            kwargs_for_check=kwargs_for_check,
            add_to_dashboard=add_monitor_to_dashboard
        )
        return self.add_alert_rule_on_existing_monitor(
            monitor_id=monitor_id,
            threshold=threshold,
            alert_severity=alert_severity,
            greater_than=greater_than
        )

    @docstrings
    def add_monitor(
        self,
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
        {add_monitor_params:1*indent}

        Returns
        -------
        int
            The monitor id.
        """
        if add_to_dashboard:
            dashboard = t.cast(t.Dict[str, t.Any], self.api.fetch_dashboard())
            dashboard_id = dashboard['id']
        else:
            dashboard_id = None

        check_id = self._get_id_of_check(check_name)

        if check_id is None:
            raise ValueError(f'Check(id:{check_id}) does not exist')

        monitor = self.api.create_monitor(
            check_id=check_id,
            monitor={
                'name': name if name is not None else f'{check_name} Monitor',
                'lookback': frequency * 12 if lookback is None else lookback,
                'frequency': frequency,
                'aggregation_window': frequency if aggregation_window is None else aggregation_window,
                'dashboard_id': dashboard_id,
                'description': description,
                'additional_kwargs': kwargs_for_check
            }
        )

        monitor = t.cast(t.Dict[str, t.Any], monitor)
        return monitor['id']

    def get_versions(self) -> t.Dict[str, int]:
        """Return the existing model versions.

        Returns
        -------
        Dict[str, int]
            Dictionary of version name to version id.
        """
        versions = self.api.fetch_all_model_versions(self.model['id'])
        versions = t.cast(t.List[t.Dict[str, t.Any]], versions)
        return {it['name']: it['id'] for it in versions}

    def delete_checks(self, names: t.List[str]):
        """Delete checks by name.

        Parameters
        ----------
        names : list
            The checks' names.
        """
        checks_not_in_model = [x for x in names if x not in self.get_checks().keys()]

        if len(checks_not_in_model) > 0:
            warnings.warn(f'The following checks do not exist in model: {checks_not_in_model}')

        checks_to_delete = [x for x in names if x not in checks_not_in_model]
        self.api.delete_model_checks_by_name(self.model['id'], checks_to_delete)
        pretty_print(f'The following checks were successfully deleted: {checks_to_delete}')
