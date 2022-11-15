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
# flake8: noqa: F821
import typing as t
import warnings
from datetime import datetime

import numpy as np
import pandas as pd
import pendulum as pdl
from deepchecks.tabular import Dataset
from deepchecks.tabular.checks import (CategoryMismatchTrainTest, SingleDatasetPerformance, TrainTestFeatureDrift,
                                       TrainTestLabelDrift, TrainTestPredictionDrift)
from deepchecks.tabular.checks.data_integrity import PercentOfNulls
from deepchecks.utils.dataframes import un_numpy
from deepchecks_client.core import client as core_client
from deepchecks_client.core.utils import (ColumnType, DeepchecksColumns, DeepchecksEncoder, DeepchecksJsonValidator,
                                          TaskType, parse_timestamp, pretty_print)


class DeepchecksModelVersionClient(core_client.DeepchecksModelVersionClient):
    """Client to interact with a given model version, including all functions to send data.

    Parameters
    ----------
    host : str
        The deepchecks monitoring API host.
    model_version_id : int
        The id of the model version.
    """

    def set_feature_importance(
        self,
        feature_importance: t.Union[t.Dict[str, float], 'pandas.Series[float]']
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
            data: 'pandas.DataFrame',
            timestamps: t.Union['pandas.Series[datetime]', 'pandas.Series[int]'],
            predictions: t.Union['pandas.Series[str]', 'pandas.Series[float]'],
            prediction_probas: t.Optional['pandas.Series[t.Sequence[float]]'] = None,
            labels: t.Union['pandas.Series[str]', 'pandas.Series[float]', None] = None,
            samples_per_send: int = 10_000
    ):
        """Log batch of samples.

        Parameters
        ----------
        data : pandas.DataFrame
            set of features and optionally of non-features.
            Expected that dataframe will contain a 'sample_id' column,
            a set of identifiers that uniquely identifies each logged sample,
            but if the 'sample_id' column is not provided then the dataframe
            index will be used instead.
        timestamps : Union[pandas.Series[datetime], pandas.Series[int]]
            set of timestamps
        predictions : Union[pandas.Series[str], pandas.Series[float]]
            set of predictions
        prediction_probas : Optional[pandas.Series[Sequence[float]]] , default None
            set of predictions probabilities
        labels : Union[pandas.Series[str], pandas.Series[float], None] , default None
            set of labels
        samples_per_send : int , default 10_000
            how many samples to send by one request
        """
        if samples_per_send < 1:
            raise ValueError('"samples_per_send" must be ">=" than 1')

        if len(data) == 0:
            raise ValueError('"data" cannot be empty')

        if 'sample_id' in data.columns:
            if data['sample_id'].is_unique is False:
                raise ValueError('sample ids must be unique')
            if not data['sample_id'].notna().all():
                raise ValueError('"sample_id" column must not contain None/Nan')
            data = data.set_index('sample_id')
        else:
            if data.index.is_unique is False:
                raise ValueError('"data.index" must contain unique values')

        error_template = (
            '"{param}" and "data" parameters indexes mismatch, '
            'make sure that "{param}.index" is the same as '
            '"data.index" (or data["sample_id"])'
        )

        if not data.index.equals(timestamps.index):
            raise ValueError(error_template.format(param='timestamps'))
        if not data.index.equals(predictions.index):
            raise ValueError(error_template.format(param='predictions'))

        data = data.assign(prediction=predictions)
        data = data.assign(timestamp=timestamps)

        if prediction_probas is not None:
            if not data.index.equals(prediction_probas.index):
                raise ValueError(error_template.format(param='prediction_probas'))
            else:
                data = data.assign(prediction_proba=prediction_probas)

        if labels is not None:
            if not data.index.equals(labels.index):
                raise ValueError(error_template.format(param='labels'))
            else:
                data = data.assign(label=labels)

        for i in range(0, len(data), samples_per_send):
            self._log_batch(data.iloc[i:i + samples_per_send])

    def _log_batch(self, samples: pd.DataFrame):
        for index, row in samples.iterrows():
            sample = row.to_dict()
            if 'sample_id' in sample:
                self.log_sample(**sample)
            else:
                self.log_sample(sample_id=str(index), **sample)
        self.send()

    def log_sample(
            self,
            sample_id: str,
            prediction: t.Any,
            timestamp: t.Union[datetime, int, None] = None,
            prediction_proba=None,
            label=None,
            **values
    ):
        """Add a data sample for the model version update queue. Requires a call to send() to upload.

        Parameters
        ----------
        sample_id : str
            Universal id for the sample. Used to retrieve and update the sample.
        timestamp : Union[datetime, int], optional
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
        if timestamp is None:
            warnings.warn('log_sample was called without timestamp, using current time instead')

        task_type = TaskType(self.model['task_type'])
        timestamp = parse_timestamp(timestamp) if timestamp is not None else pdl.now()

        sample = {
            DeepchecksColumns.SAMPLE_ID_COL.value: str(sample_id),
            DeepchecksColumns.SAMPLE_TS_COL.value: timestamp.to_iso8601_string(),
            **values
        }

        if task_type in {TaskType.MULTICLASS, TaskType.BINARY}:
            if label is not None:
                sample[DeepchecksColumns.SAMPLE_LABEL_COL.value] = str(label)
            if prediction_proba is not None:
                if self.model_classes is None:
                    raise ValueError('Can\'t pass prediction_proba if version was not configured with model classes.')
                if isinstance(prediction_proba, pd.Series):
                    prediction_proba = np.asarray(prediction_proba)
                if len(prediction_proba) != len(self.model_classes):
                    raise ValueError('Number of classes in prediction_proba does not match number of classes in '
                                     'model classes.')
                sample[DeepchecksColumns.SAMPLE_PRED_PROBA_COL.value] = prediction_proba
            prediction = str(prediction)
            if self.model_classes and prediction not in self.model_classes:
                raise ValueError(f'Provided prediction not in allowed model classes: {prediction}')
            sample[DeepchecksColumns.SAMPLE_PRED_COL.value] = prediction
        elif task_type == TaskType.REGRESSION:
            if label is not None:
                sample[DeepchecksColumns.SAMPLE_LABEL_COL.value] = float(label)
            sample[DeepchecksColumns.SAMPLE_PRED_COL.value] = float(prediction)
            if prediction_proba is not None:
                raise ValueError('Can\'t pass prediction_proba for regression task.')
        else:
            raise ValueError(f'Unknown or unsupported task type provided - {task_type}')

        # Make sure that integer categorical columns are still sent as strings:
        for col in self.categorical_columns:
            sample[col] = str(sample[col])

        sample = DeepchecksEncoder.encode(sample)
        self.schema_validator.validate(sample)
        self._log_samples.append(sample)

    def upload_reference(
            self,
            dataset: Dataset,
            predictions: np.ndarray,
            prediction_probas: t.Optional[np.ndarray] = None,
            samples_per_request: int = 5000
    ):
        """Upload reference data. Possible to upload only once for a given model version.

        Parameters
        ----------
        dataset : deepchecks.tabular.Dataset
            The reference dataset.
        prediction_probas : np.ndarray
            The prediction probabilities.
        predictions : np.ndarray
            The prediction labels.
        samples_per_request : int
            The samples per batch request.
        """
        data = dataset.features_columns.copy()

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

        if len(dataset) > 100_000:
            data = data.sample(100_000, random_state=42)
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

    def update_batch(
            self,
            samples_to_update: 't.Union[pandas.DataFrame, t.Sequence]',
            labels: t.Union['pandas.Series[str]', 'pandas.Series[float]', None] = None,
            timestamps: t.Union['pandas.Series[datetime]', 'pandas.Series[int]', None] = None,
            predictions: t.Union['pandas.Series[str]', 'pandas.Series[float]', None] = None,
            prediction_probas: t.Optional['pandas.Series[t.Sequence[float]]'] = None,
            samples_per_send: int = 10_000
    ):
        """Update values of already uploaded samples.

        Parameters
        ----------
        samples_to_update : Union[pandas.DataFrame, Sequence]
            Either a sequence of sample ids to update or a dataframe which contain a 'sample_id' column,
            in addition to other values to update for those samples.
        timestamps : Union[pandas.Series[datetime], pandas.Series[int]], default None
            set of timestamps
        predictions : Union[pandas.Series[str], pandas.Series[float]], default None
            set of predictions
        prediction_probas : Optional[pandas.Series[Sequence[float]]], default None
            set of predictions probabilities
        labels : Union[pandas.Series[str], pandas.Series[float], None], default None
            set of labels
        samples_per_send : int , default 10_000
            how many samples to send by one request
        """
        if samples_per_send < 1:
            raise ValueError("'samples_per_send' must be '>=' than 1")

        if len(samples_to_update) == 0:
            raise ValueError("'samples_to_update' cannot be empty")

        if not isinstance(samples_to_update, pd.DataFrame):
            samples_to_update = pd.DataFrame(list(samples_to_update), columns=['sample_id'])

        if 'sample_id' in samples_to_update.columns:
            if samples_to_update['sample_id'].is_unique is False:
                raise ValueError('sample ids must be unique')
            if not samples_to_update['sample_id'].notna().all():
                raise ValueError('"sample_id" column must not contain None/Nan')
            samples_to_update = samples_to_update.set_index('sample_id')
        else:
            if samples_to_update.index.is_unique is False:
                raise ValueError('"data.index" must contain unique values')

        error_template = (
            '"{param}" and "samples_to_update" parameters indexes mismatch, '
            'make sure that "{param}.index" is the same as '
            '"data.index" (or data["sample_id"])'
        )

        if timestamps is not None:
            if not samples_to_update.index.equals(timestamps.index):
                raise ValueError(error_template.format(param='timestamps'))
            samples_to_update = samples_to_update.assign(timestamp=timestamps)
        if predictions is not None:
            if not samples_to_update.index.equals(predictions.index):
                raise ValueError(error_template.format(param='predictions'))
            samples_to_update = samples_to_update.assign(prediction=predictions)
        if prediction_probas is not None:
            if not samples_to_update.index.equals(prediction_probas.index):
                raise ValueError(error_template.format(param='prediction_probas'))
            samples_to_update = samples_to_update.assign(prediction_proba=prediction_probas)
        if labels is not None:
            if not samples_to_update.index.equals(labels.index):
                raise ValueError(error_template.format(param='labels'))
            samples_to_update = samples_to_update.assign(label=labels)

        for i in range(0, len(samples_to_update), samples_per_send):
            self._update_batch(samples_to_update.iloc[i:i + samples_per_send])

    def _update_batch(self, samples: 'pandas.DataFrame'):
        for index, row in samples.iterrows():
            sample = row.to_dict()
            if 'sample_id' in sample:
                self.update_sample(**sample)
            else:
                self.update_sample(sample_id=str(index), **sample)
        self.send()

    def update_sample(self, sample_id: str, label=None, **values):
        """Update an existing sample. Adds the sample to the update queue. Requires a call to send() to upload.

        Parameters
        ----------
        sample_id : str
            Universal id for the sample. Used to retrieve and update the sample.
        label
            True label of sample.
        values
            Features of the sample and optional non_features we wise to update.
        """
        update = {DeepchecksColumns.SAMPLE_ID_COL.value: str(sample_id), **values}
        task_type = TaskType(self.model['task_type'])

        if label:
            label = float(label) if task_type == TaskType.REGRESSION else str(label)
            update[DeepchecksColumns.SAMPLE_LABEL_COL.value] = label

        # Make sure that integer categorical columns are still sent as strings:
        provided_values = set(update.keys())
        for col in self.categorical_columns:
            if col in provided_values:
                update[col] = str(update[col])
        update = DeepchecksEncoder.encode(update)

        # Create update schema, which contains only non-required columns and sample id
        required_columns = set(self.schema['required'])
        optional_columns_schema = {
            'type': 'object',
            'properties': {k: v for k, v in self.schema['properties'].items()
                           if k not in required_columns or k == DeepchecksColumns.SAMPLE_ID_COL.value},
            'required': [DeepchecksColumns.SAMPLE_ID_COL.value],
            'additionalProperties': False
        }
        DeepchecksJsonValidator(optional_columns_schema).validate(update)

        self._update_samples.append(update)


class DeepchecksModelClient(core_client.DeepchecksModelClient):
    """Client to interact with a model in monitoring. Created via the DeepchecksClient's get_or_create_model function.

    Parameters
    ----------
    host : str
        The deepchecks monitoring API host.
    model_id : int
        The id of the model.
    """

    def version(
            self,
            name: str,
            features: t.Optional[t.Dict[str, str]] = None,
            non_features: t.Optional[t.Dict[str, str]] = None,
            feature_importance: t.Union[t.Dict[str, float], 'pd.Series[float]', None] = None,
            model_classes: t.Optional[t.Sequence[str]] = None
    ) -> DeepchecksModelVersionClient:
        """Create a new model version.

        Parameters
        ----------
        name : str
            Name to display for new version
        features : Optional[Dict[str, str]], default: None
            A dictionary of feature names and values from ColumnType enum. Required for creation of a new version.
        non_features : Optional[Dict[str, str]], default: None
            A dictionary of non feature names and values from ColumnType enum. Required for creation of a new version.
        feature_importance : Union[Dict[str, float], pandas.Series[float]], default: None
            A dictionary or pandas series of feature names and their feature importance value.
        model_classes : Optional[Sequence[str]], default: None
            List of classes used by the model. Must define classes in order to send probabilities.

        Returns
        -------
        DeepchecksModelVersionClient
            Client to interact with the newly created version.
        """

        existing_version_id = self._get_existing_version_id_or_none(version_name=name)
        if existing_version_id is not None:
            return self._version_client(existing_version_id)

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

            if non_features is not None:
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
                    'non_features': non_features or {},
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
