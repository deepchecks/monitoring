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
import io
import pathlib
# flake8: noqa: F821
import typing as t
import warnings
from datetime import datetime

import httpx
import numpy as np
import pandas as pd
import pendulum as pdl
from deepchecks.tabular import Dataset
from deepchecks.tabular.checks import (CategoryMismatchTrainTest, SingleDatasetPerformance, TrainTestFeatureDrift,
                                       TrainTestLabelDrift, TrainTestPredictionDrift)
from deepchecks.tabular.checks.data_integrity import PercentOfNulls
from deepchecks.utils.dataframes import un_numpy
from deepchecks_client._shared_docs import docstrings
from deepchecks_client.core import client as core_client
from deepchecks_client.core.utils import (ColumnType, DataFilter, DeepchecksColumns, DeepchecksEncoder,
                                          DeepchecksJsonValidator, TaskType, maybe_raise, parse_timestamp, pretty_print,
                                          validate_additional_data_schema)
from deepchecks_client.tabular.utils import DataSchema, read_schema, standardize_predictions


class DeepchecksModelVersionClient(core_client.DeepchecksModelVersionClient):
    """Client to interact with a given model version, including all functions to send data.

    Parameters
    ----------
    host : str
        The deepchecks monitoring API host.
    model_version_id : int
        The id of the model version.
    """

    def _dataframe_to_dataset_and_pred(self, df:  pd.DataFrame) \
            -> t.Tuple[Dataset, t.Optional[np.ndarray], t.Optional[np.ndarray]]:
        """Convert a dataframe to deepcheck dataset and predictions array."""
        if df is None or len(df) == 0:
            return None, None, None

        y_pred = None
        y_proba = None

        if DeepchecksColumns.SAMPLE_PRED_COL in df.columns:
            if not df[DeepchecksColumns.SAMPLE_PRED_COL].isna().all():
                y_pred = np.array(df[DeepchecksColumns.SAMPLE_PRED_COL].to_list())
            df.drop(DeepchecksColumns.SAMPLE_PRED_COL, inplace=True, axis=1)
        if DeepchecksColumns.SAMPLE_PRED_PROBA_COL in df.columns:
            if not df[DeepchecksColumns.SAMPLE_PRED_PROBA_COL].isna().all():
                y_proba = np.array(df[DeepchecksColumns.SAMPLE_PRED_PROBA_COL].to_list())
            df.drop(DeepchecksColumns.SAMPLE_PRED_PROBA_COL, inplace=True, axis=1)

        cat_features = [feat_name for feat_name, feat_type in self.features.items() if feat_type
                        in [ColumnType.CATEGORICAL, ColumnType.BOOLEAN]]
        dataset_params = {'features': list(self.features.keys()),
                          'cat_features': cat_features, 'label_type': self.model['task_type']}

        if df[DeepchecksColumns.SAMPLE_LABEL_COL].isna().all():
            df.drop(DeepchecksColumns.SAMPLE_LABEL_COL, inplace=True, axis=1)
        else:
            dataset_params['label'] = DeepchecksColumns.SAMPLE_LABEL_COL.value

        if DeepchecksColumns.SAMPLE_TS_COL in df.columns:
            df.drop(DeepchecksColumns.SAMPLE_TS_COL, inplace=True, axis=1)

        dataset = Dataset(df, **dataset_params)
        return dataset, y_pred, y_proba

    def get_deepchecks_reference_dataset(
        self,
        rows_count: int = 10_000,
        filters: t.List[DataFilter] = None,
    ) -> t.Tuple[Dataset, t.Optional[np.ndarray], t.Optional[np.ndarray]]:
        """Get a deepchecks dataset and predictions for a model version reference data.

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
        t.Tuple[Dataset, t.Optional[np.ndarray], t.Optional[np.ndarray]]
            a tuple of: (deepchecks dataset, predictions array, prediction probabilities array).
        """
        df = self.api.get_model_version_reference_data(self.model_version_id, rows_count, filters)
        return self._dataframe_to_dataset_and_pred(df)

    def get_deepchecks_production_dataset(
        self,
        start_time: t.Union[datetime, str, int],
        end_time: t.Union[datetime, str, int],
        rows_count: int = 10_000,
        filters: t.List[DataFilter] = None,
    ) -> t.Tuple[Dataset, t.Optional[np.ndarray], t.Optional[np.ndarray]]:
        """Get a deepchecks dataset and predictions for a model version production data on a specific window.

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
        t.Tuple[Dataset, t.Optional[np.ndarray], t.Optional[np.ndarray]]
            a tuple of: (deepchecks dataset, predictions array, prediction probabilities array).
        """
        df = self.api.get_model_version_production_data(self.model_version_id,
                                                        start_time, end_time,
                                                        rows_count, filters)
        return self._dataframe_to_dataset_and_pred(df)

    def set_feature_importance(
            self,
            feature_importance: t.Union[t.Dict[str, float], 'pd.Series[float]']
    ):
        """Set model version feature importance.

        Parameters
        ----------
        feature_importance : Union[Dict[str, float], pandas.Series[float]]
            A dictionary or pandas series of feature names and their feature importance values.
            Overrides existing feature importance, note that this may change value of certain checks.
        """
        model_version = self.api.fetch_model_version(self.model_version_id)
        model_version = t.cast(t.Dict[str, t.Any], model_version)

        if not model_version.get('feature_importance'):
            warnings.warn('Model version already has feature importance.')

        feature_importance = (
            dict(feature_importance)
            if isinstance(feature_importance, pd.Series)
            else feature_importance
        )

        if not all(isinstance(it, float) for it in feature_importance.values()):
            raise ValueError('feature_importance must contain only values of type float')

        self.api.update_model_version(
            model_version_id=self.model_version_id,
            data={'feature_importance': feature_importance}
        )

        model_version_name = model_version.get('name')

        pretty_print(
            f'Feature importance of "{model_version_name}" model version was updated. '
            'Please, note that feature importance modification may change value of '
            'certain checks.'
        )

    def log_batch(
            self,
            sample_ids: np.ndarray,
            data: 'pd.DataFrame',
            predictions: t.Union[pd.Series, np.ndarray, t.List],
            prediction_probas: t.Optional[np.ndarray] = None,
            labels: t.Optional[np.ndarray] = None,
            timestamps: t.Optional[np.ndarray] = None,
            samples_per_send: int = 10_000
    ):
        """Log batch of samples.

        Parameters
        ==========
        sample_ids : numpy.ndarray
            set of sample ids
        data : pandas.DataFrame
            set of features and optionally of non-features.
        predictions : Union[pd.Series, np.ndarray, t.List]
            set of predictions
        prediction_probas : Optional[numpy.ndarray] , default None
            set of predictions probabilities
        labels : Optional[numpy.ndarray] , default None
            set of labels
        timestamps : Optional[numpy.ndarray] , default None
            set of timestamps.
            If not provided then current time will be used.
            If no timezone info is provided on the datetime assumes local timezone.
        samples_per_send : int , default 10_000
            how many samples to send by one request
        """
        if samples_per_send < 1:
            raise ValueError('"samples_per_send" must be ">=" than 1')

        if timestamps is None:
            warnings.warn('log_batch was called without timestamps, using current time instead')
            timestamps = np.array([pdl.now()] * len(sample_ids))

        data_batch = _process_batch(
            schema_validator=self.schema_validator,
            data_columns=self.all_columns,
            task_type=TaskType(self.model['task_type']),
            sample_ids=sample_ids,
            data=data,
            timestamps=timestamps,
            predictions=predictions,
            prediction_probas=prediction_probas,
            model_classes=self.model_classes,
            labels=labels,
        )

        self.send()

        for i in range(0, len(data_batch), samples_per_send):
            for record in data_batch[i:i + samples_per_send]:
                self._log_samples.append(record)
            self.send()

    def log_sample(
            self,
            values: t.Dict[str, t.Any],
            sample_id: str,
            prediction: t.Union[str, float],
            timestamp: t.Union[datetime, int, str, None] = None,
            prediction_proba: t.Optional[t.Sequence[float]] = None,
            label: t.Union[str, float, None] = None,
    ):
        """Add a data sample for the model version update queue. Requires a call to send() to upload.

        Parameters
        ----------
        values : Dict[str, Any]
            All features of the sample and optional additional_data
        sample_id : str
            Universal id for the sample. Used to retrieve and update the sample.
        timestamp : Union[datetime, int, str, None], default None
            Can be one of:
                - int: Unix timestamp
                - str: timestamp in ISO8601 format
                - datetime: If no timezone info is provided on the datetime assumes local timezone.
                - None: will use current time
        prediction_proba : Optional[Sequence[float]] , default None
            Prediction value if exists
        prediction : Union[str, float]
            Prediction label if exists
        label : Union[str, float, None] , default None
            True label of sample
        """
        if timestamp is None:
            warnings.warn('log_sample was called without timestamp, using current time instead')
            timestamp = pdl.now()
        self._log_samples.append(_process_sample(
            schema_validator=self.schema_validator,
            data_columns=self.all_columns,
            task_type=TaskType(self.model['task_type']),
            sample_id=sample_id,
            values=values,
            timestamp=timestamp,
            prediction=prediction,
            prediction_proba=prediction_proba,
            model_classes=self.model_classes,
            label=label,
        ))

    def upload_reference(
            self,
            dataset: Dataset,
            predictions: t.Union[pd.Series, np.ndarray, t.List],
            prediction_probas: t.Optional[np.ndarray] = None,
            samples_per_request: int = 5000
    ):
        """Upload reference data. Possible to upload only once for a given model version.

        Parameters
        ----------
        dataset : deepchecks.tabular.Dataset
            The reference dataset.
        prediction_probas : Optional[np.ndarray]
            The prediction probabilities.
        predictions : Union[pd.Series, np.ndarray, t.List]
            The prediction labels.
        samples_per_request : int
            The samples per batch request.
        """
        columns_to_use = [col for col in dataset.data.columns if col not in
                          [dataset.label_name if dataset.has_label() else None,
                           dataset.index_name,
                           dataset.datetime_name]]
        data = dataset.data[columns_to_use].copy()

        predictions = standardize_predictions(predictions)
        if len(predictions) != len(dataset):
            raise ValueError('predictions and dataset must contain the same number of items')

        if self.model['task_type'] == TaskType.REGRESSION.value:
            if dataset.has_label():
                data[DeepchecksColumns.SAMPLE_LABEL_COL.value] = list(dataset.label_col.apply(float))
            data[DeepchecksColumns.SAMPLE_PRED_COL.value] = [float(x) for x in predictions]
            if prediction_probas is not None:
                raise ValueError('Can\'t pass prediction_probas to regression task.')
        else:
            if dataset.has_label():
                data[DeepchecksColumns.SAMPLE_LABEL_COL.value] = list(dataset.label_col.apply(str))
            if prediction_probas is not None:
                if self.model_classes is None:
                    raise ValueError('Can\'t pass prediction_probas if version was not configured with model classes.')
                if isinstance(prediction_probas, pd.DataFrame):
                    prediction_probas = np.asarray(prediction_probas)
                if prediction_probas.shape[1] != len(self.model_classes):
                    raise ValueError('number of classes in prediction_probas does not match number of classes in '
                                     'model classes.')
                # TODO: add validation probas sum to one for each row?
                data[DeepchecksColumns.SAMPLE_PRED_PROBA_COL.value] = un_numpy(prediction_probas)
            data[DeepchecksColumns.SAMPLE_PRED_COL.value] = [str(x) for x in predictions]

            if self.model_classes:
                new_labels = set(data[DeepchecksColumns.SAMPLE_LABEL_COL.value]) - set(self.model_classes)
                if new_labels:
                    raise ValueError(f'Got labels not in model classes: {new_labels}')
                new_predictions = set(data[DeepchecksColumns.SAMPLE_PRED_COL.value]) - set(self.model_classes)
                if new_predictions:
                    raise ValueError(f'Got predictions not in model classes: {new_predictions}')

        if len(dataset) > core_client.MAX_REFERENCE_SAMPLES:
            data = data.sample(core_client.MAX_REFERENCE_SAMPLES, random_state=42)
            warnings.warn('Maximum size allowed for reference data is 100,000, applying random sampling')

        # Make sure that integer categorical columns are still sent as strings:
        data[self.categorical_columns] = data[self.categorical_columns].astype(str)

        validator = DeepchecksJsonValidator(self.ref_schema)
        for _, row in data.iterrows():
            item = row.to_dict()
            item = DeepchecksEncoder.encode(item)
            validator.validate(item)

        self._upload_reference(data, samples_per_request)
        pretty_print('Reference data uploaded.')


class DeepchecksModelClient(core_client.DeepchecksModelClient):
    """Client to interact with a tabular model in monitoring."""

    @docstrings
    def version(
            self,
            name: str,
            schema: t.Union[str, pathlib.Path, io.TextIOBase, DataSchema] = None,
            feature_importance: t.Union[t.Dict[str, float], 'pd.Series[float]', None] = None,
            model_classes: t.Optional[t.Sequence[str]] = None
    ) -> DeepchecksModelVersionClient:
        """Create a new model version.

        Parameters
        ----------
        name : str
            Name to display for new version
        {schema_param_none:2*indent}
        feature_importance : Union[Dict[str, float], pandas.Series[float]], default: None
            A dictionary or pandas series of feature names and their feature importance value.
        model_classes : Optional[Sequence[str]], default: None
            List of classes used by the model. Must define classes in order to send probabilities.

        Returns
        -------
        DeepchecksModelVersionClient
            Client to interact with the newly created version.
        """
        response = t.cast(httpx.Response, self.api.fetch_model_version_by_name(
            model_name=self.model['name'],
            model_version_name=name,
            raise_on_status=False
        ))

        if 200 <= response.status_code <= 299:
            existing_version = response.json()
            version_client = self._version_client(existing_version['id'])
            features = None
            additional_data = None

            if schema is not None:
                schema = read_schema(schema, fail_on_invalid_column=True)
                features = schema['features']
                additional_data = schema['additional_data']

            version_client.validate(
                features=features,
                additional_data=additional_data,
                feature_importance=feature_importance,
                model_classes=model_classes
            )

            return version_client

        if response.status_code != 404:
            maybe_raise(response)  # execution ends here, function will raose an error

        if schema is None:
            raise ValueError('schema must be provided when creating a new version')

        schema = read_schema(schema, fail_on_invalid_column=True)
        features, additional_data = schema['features'], schema['additional_data']

        if features is None:
            raise ValueError('Model Version name does not exists for this model and no features were provided.')
        else:
            # Start with validation
            if not isinstance(features, dict):
                raise ValueError('features must be a dict')
            for key, value in features.items():
                if not isinstance(key, str):
                    raise ValueError(f'key of features must be of type str but got: {type(key)}')
                if value not in ColumnType.values():
                    raise ValueError(f'value of features must be one of {ColumnType.values()} but got {value}')

            if feature_importance is not None:
                if isinstance(feature_importance, pd.Series):
                    feature_importance = dict(feature_importance)
                if not isinstance(feature_importance, dict):
                    raise ValueError('feature_importance must be a dict')
                if any((not isinstance(v, float) for v in feature_importance.values())):
                    raise ValueError('feature_importance must contain only values of type float')
            else:
                warnings.warn(
                    'It is recommended to provide feature importance for more insightful results.\n'
                    'Accurate feature importance can be calculated via "deepchecks.tabular.feature_importance"'
                )

            validate_additional_data_schema(additional_data, features)

            if model_classes:
                if not isinstance(model_classes, t.Sequence):
                    raise ValueError(f'model_classes must be a sequence but got type {type(model_classes)}')
                if len(model_classes) < 2:
                    raise ValueError(f'model_classes length must be at least 2 but got {len(model_classes)}')
                model_classes = [str(x) for x in model_classes]
                if sorted(model_classes) != model_classes:
                    raise ValueError('model_classes must be sorted alphabetically')

            created_version = self.api.create_model_version(
                self.model['id'],
                model_version={
                    'name': name,
                    'features': features,
                    'additional_data': additional_data or {},
                    'feature_importance': feature_importance,
                    'classes': model_classes
                }
            )

            pretty_print(f'Model version {name} was successfully created.')
            created_version = t.cast(t.Dict[str, t.Any], created_version)
            model_version_id = created_version['id']

        return self._version_client(model_version_id)

    def _version_client(self, model_version_id: int) -> DeepchecksModelVersionClient:
        """Get client to interact with a given version of the model.

        Parameters
        ----------
        model_version_id : int
            The id of the version.

        Returns
        -------
        DeepchecksModelVersionClient
        """
        if self._model_version_clients.get(model_version_id) is None:
            version_client = DeepchecksModelVersionClient(model_version_id, self.model, api=self.api)
            self._model_version_clients[model_version_id] = version_client
        return self._model_version_clients[model_version_id]

    def _add_defaults(self):
        """Add default checks, monitors and alerts to a tabular model."""
        checks = {
            'Feature Drift': TrainTestFeatureDrift(),
            'Prediction Drift': TrainTestPredictionDrift(),
            'Label Drift': TrainTestLabelDrift(),
            'Train-Test Category Mismatch': CategoryMismatchTrainTest(),
            'Percent Of Nulls': PercentOfNulls()
        }

        if TaskType(self.model['task_type']) in [TaskType.BINARY, TaskType.MULTICLASS]:
            checks['Performance'] = SingleDatasetPerformance(scorers={'Accuracy': 'accuracy'})
        else:
            checks['Performance'] = SingleDatasetPerformance(scorers={'RMSE': 'rmse'})
        self.add_checks(checks=checks)

        self.add_alert_rule(check_name='Feature Drift', threshold=0.25, frequency=24 * 60 * 60, alert_severity='high',
                            monitor_name='Aggregated Feature Drift', add_monitor_to_dashboard=True)
        self.add_alert_rule(check_name='Feature Drift', threshold=0.3, frequency=24 * 60 * 60,
                            monitor_name='Top 5 Feature Drift',
                            kwargs_for_check={'res_conf': None, 'check_conf': {'aggregation method': ['top_5']}})

        self.add_alert_rule(check_name='Prediction Drift', threshold=0.25, frequency=24 * 60 * 60,
                            monitor_name='Prediction Drift', add_monitor_to_dashboard=True, alert_severity='high')
        self.add_alert_rule(check_name='Label Drift', threshold=0.25, frequency=24 * 60 * 60,
                            monitor_name='Label Drift', add_monitor_to_dashboard=True, alert_severity='high')

        self.add_monitor(check_name='Performance', frequency=24 * 60 * 60, name='Performance')


def _process_batch(
    *,
    task_type: TaskType,
    schema_validator: DeepchecksJsonValidator,
    data_columns: t.Dict[str, str],
    sample_ids: np.ndarray,
    data: t.Optional[pd.DataFrame] = None,
    labels: t.Optional[np.ndarray] = None,
    timestamps: t.Optional[np.ndarray] = None,
    predictions: t.Optional[t.Union[pd.Series, np.ndarray, t.List]] = None,
    model_classes: t.Optional[t.Sequence[str]] = None,
    prediction_probas: t.Optional[np.ndarray] = None,
) -> t.List[t.Dict[str, t.Any]]:
    """Preapare and validate batch of samples."""
    # Validate 'sample_ids' array
    if len(sample_ids) == 0:
        raise ValueError('"sample_ids" cannot be empty')
    if len(sample_ids) != len(np.unique(sample_ids)):
        raise ValueError('"sample_ids" must contain only unique items')
    if not pd.notna(sample_ids).all():
        raise ValueError('"sample_ids" must not contain None/Nan')

    metadata = pd.DataFrame({'sample_id': sample_ids})
    error_template = '"{}" and "sample_ids" must contain same number of items'

    # Validate 'timestamps' array
    if timestamps is not None:
        if len(timestamps) != len(sample_ids):
            raise ValueError(error_template.format('timestamps'))
        else:
            metadata['timestamp'] = timestamps

    # Validate 'predictions' array
    if predictions is not None:
        predictions = standardize_predictions(predictions)
        if len(predictions) != len(sample_ids):
            raise ValueError(error_template.format('predictions'))
        else:
            metadata['prediction'] = predictions

    # Validate 'prediction_probas' array
    if prediction_probas is not None:
        if len(prediction_probas) != len(sample_ids):
            raise ValueError(error_template.format('prediction_probas'))
        elif prediction_probas.ndim != 2:
            raise ValueError('"prediction_probas" must be a two-dimensional array')
        else:
            metadata['prediction_proba'] = list(prediction_probas)

    # Validate 'labels' array
    if labels is not None:
        if len(labels) != len(sample_ids):
            raise ValueError(error_template.format('labels'))
        else:
            metadata['label'] = labels

    batch = metadata.to_dict(orient='records')

    if data is None:
        return [
            _process_sample(
                task_type=task_type,
                schema_validator=schema_validator,
                data_columns=data_columns,
                model_classes=model_classes,
                **record
            )
            for record in batch  # pylint: disable=not-an-iterable
        ]
    else:
        # notify user about suspicious sample indexes
        # that might have been provided by mistake
        if (sample_ids == data.index).all():
            # TODO: replace this with link to docs when they are ready
            warnings.warn(
                'Index of provided "data" dataframe completely matches "sample_ids" array, '
                'are you sure that "samples_ids" array is correct and contains correct '
                'identifiers?',
                category=UserWarning
            )

        # ensure all columns availability
        # and throw away unknown(additional) columns
        all_columns = set(data_columns.keys())
        provided_columns = set(data.columns)

        missing_columns = all_columns.difference(provided_columns)
        if missing_columns:
            raise ValueError(f'The following schema columns are missing: {list(missing_columns)}')
        additional_columns = provided_columns.difference(all_columns)
        if additional_columns:
            warnings.warn(
                'The following columns were not defined in schema '
                f'and will be ignored: {list(additional_columns)}'
            )
            data = data.loc[:list(data_columns.keys())]

        # Validate "data" dataframe
        if data.shape[0] != len(sample_ids):
            raise ValueError(error_template.format('data'))

        data_batch = data.to_dict(orient='records')

        return [
            _process_sample(
                task_type=task_type,
                schema_validator=schema_validator,
                data_columns=data_columns,
                values=data_batch[index],
                model_classes=model_classes,
                **record
            )
            for index, record in enumerate(batch)
        ]


def _process_sample(
    *,
    task_type: TaskType,
    schema_validator: DeepchecksJsonValidator,
    data_columns: t.Dict[str, str],
    sample_id: str,
    values: t.Optional[t.Dict[str, t.Any]] = None,
    prediction: t.Union[str, float, None] = None,
    timestamp: t.Union[datetime, int, str, None] = None,
    prediction_proba: t.Optional[t.Sequence[float]] = None,
    model_classes: t.Optional[t.Sequence[str]] = None,
    label: t.Union[str, float, None] = None,
) -> t.Dict[str, t.Any]:
    """Prepare and validate sample dictionary instance."""
    if values is None:
        sample: t.Dict[str, t.Any] = {DeepchecksColumns.SAMPLE_ID_COL.value: str(sample_id)}
    else:
        sample: t.Dict[str, t.Any] = {DeepchecksColumns.SAMPLE_ID_COL.value: str(sample_id), **values}

    if timestamp is not None:
        sample[DeepchecksColumns.SAMPLE_TS_COL.value] = parse_timestamp(timestamp).to_iso8601_string()

    if task_type in {TaskType.MULTICLASS, TaskType.BINARY}:
        if label is not None:
            sample[DeepchecksColumns.SAMPLE_LABEL_COL.value] = str(label)

        if prediction_proba is not None:
            if model_classes is None:
                raise ValueError(
                    'Can\'t pass prediction_proba if version was not '
                    'configured with model classes.'
                )
            if len(prediction_proba) != len(model_classes):
                raise ValueError(
                    'Number of classes in prediction_proba does not '
                    'match number of classes in model classes.'
                )
            sample[DeepchecksColumns.SAMPLE_PRED_PROBA_COL.value] = list(prediction_proba)

        if prediction is not None:
            prediction = str(prediction)
            if model_classes is not None and prediction not in model_classes:
                raise ValueError(f'Provided prediction not in allowed model classes: {prediction}')
            sample[DeepchecksColumns.SAMPLE_PRED_COL.value] = str(prediction)

    elif task_type == TaskType.REGRESSION:
        if label is not None:
            sample[DeepchecksColumns.SAMPLE_LABEL_COL.value] = float(label)
        if prediction is not None:
            sample[DeepchecksColumns.SAMPLE_PRED_COL.value] = float(prediction)
        if prediction_proba is not None:
            raise ValueError('Can\'t pass prediction_proba for regression task.')

    else:
        raise ValueError(f'Unknown or unsupported task type provided - {task_type}')

    # NOTE:
    # we need to make sure that numerical categorical data
    # are send as strings
    for name, kind in data_columns.items():
        if kind == 'categorical' and name in sample:
            sample[name] = str(sample[name])

    sample = t.cast(t.Dict[str, t.Any], DeepchecksEncoder.encode(sample))
    schema_validator.validate(sample)
    return sample
