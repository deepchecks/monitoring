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
import warnings
from datetime import datetime
from typing import Dict, Optional, Union

import numpy as np
import pandas as pd
from deepchecks.tabular import Dataset
from deepchecks.tabular.checks import (CategoryMismatchTrainTest, SingleDatasetPerformance, TrainTestFeatureDrift,
                                       TrainTestLabelDrift, TrainTestPredictionDrift)
from deepchecks.tabular.checks.data_integrity import PercentOfNulls
from deepchecks.utils.dataframes import un_numpy
from deepchecks_client.core import client as core_client
from deepchecks_client.core.client import ColumnType, DeepchecksColumns, TaskType
from deepchecks_client.core.utils import DeepchecksEncoder, DeepchecksJsonValidator, create_timestamp, maybe_raise


class DeepchecksModelVersionClient(core_client.DeepchecksModelVersionClient):
    """Client to interact with a given model version, including all functions to send data.

    Parameters
    ----------
    host: str
        The deepchecks monitoring API host.
    model_version_id: int
        The id of the model version.
    """

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
            Universal id for the sample. Used to retrieve and update the sample.
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
        timestamp = create_timestamp(timestamp)

        sample = {
            DeepchecksColumns.SAMPLE_ID_COL.value: str(sample_id),
            DeepchecksColumns.SAMPLE_TS_COL.value: timestamp.to_iso8601_string(),
            **values
        }

        if prediction is None:
            raise Exception('Model prediction must be provided when logging a sample')

        if TaskType(self.model['task_type']) in [TaskType.MULTICLASS, TaskType.BINARY]:
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

        sample = DeepchecksEncoder.encode(sample)
        DeepchecksJsonValidator(self.schema).validate(sample)
        self._log_samples.append(sample)

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
        if self.model['task_type'] == TaskType.REGRESSION.value:
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
            data[DeepchecksColumns.SAMPLE_PRED_PROBA_COL.value] = un_numpy(prediction_proba)
            data[DeepchecksColumns.SAMPLE_PRED_COL.value] = [str(x) for x in prediction]

        if len(dataset) > 100_000:
            data = data.sample(100_000, random_state=42)
            warnings.warn('Maximum size allowed for reference data is 100,000, applying random sampling')

        validator = DeepchecksJsonValidator(self.ref_schema)
        for (_, row) in data.iterrows():
            item = row.to_dict()
            item = DeepchecksEncoder.encode(item)
            validator.validate(item)

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

        update = DeepchecksEncoder.encode(update)
        DeepchecksJsonValidator(optional_columns_schema).validate(update)

        maybe_raise(
            self.session.put(
                f'model-versions/{self.model_version_id}/data',
                json=[update]
            ),
            msg="Sample update failure.\n{error}"
        )


class DeepchecksModelClient(core_client.DeepchecksModelClient):
    """Client to interact with a model in monitoring.

    Parameters
    ----------
    host: str
        The deepchecks monitoring API host.
    model_id: int
        The id of the model.
    """

    def version(
            self,
            name: str,
            features: Optional[Dict[str, str]] = None,
            non_features: Optional[Dict[str, str]] = None,
            feature_importance: Optional[Dict[str, float]] = None
    ) -> DeepchecksModelVersionClient:
        """Create a new model version.

        Parameters
        ----------
        name: str
            Name to display for new version
        features: Optional[Dict[str, str]]
            a dictionary of feature names and values from ColumnType enum
        non_features: Optional[Dict[str, str]]
            a dictionary of non feature names and values from ColumnType enum
        feature_importance: Optional[Dict[str, float]]
            a dictionary of non feature names and their feature importance value
        Returns
        -------
        DeepchecksModelVersionClient
            Client to interact with the newly created version.
        """
        if features is None:
            model_version_id = self._get_model_version_id(name)
            if model_version_id is None:
                raise ValueError('Model Version Name does not exists for this model and no features were provided.')
        else:
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
                    raise ValueError(
                        f'feature_importance and features must contain the same keys, found not shared keys: '
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
                    'feature_importance': feature_importance
                }),
                msg="Failed to create new model version.\n{error}"
            ).json()

            model_version_id = response['id']
        return self._version_client(model_version_id)

    def _version_client(self, model_version_id: int) -> DeepchecksModelVersionClient:
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
        if self._model_version_clients.get(model_version_id) is None:
            self._model_version_clients[model_version_id] = \
                DeepchecksModelVersionClient(model_version_id, self.model, session=self.session)
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

        self.add_alert_rule(check_name="Feature Drift", threshold=0.25, frequency=24 * 60 * 60, alert_severity="high",
                            monitor_name="Aggregated Feature Drift", add_monitor_to_dashboard=True)
        self.add_alert_rule(check_name="Feature Drift", threshold=0.3, frequency=24 * 60 * 60,
                            monitor_name="Top 5 Feature Drift",
                            kwargs_for_check={"res_conf": None, "check_conf": {"aggregation method": ["top_5"]}})

        self.add_alert_rule(check_name="Prediction Drift", threshold=0.25, frequency=24 * 60 * 60,
                            monitor_name="Prediction Drift", add_monitor_to_dashboard=True, alert_severity="high")
        self.add_alert_rule(check_name="Label Drift", threshold=0.25, frequency=24 * 60 * 60,
                            monitor_name="Label Drift", add_monitor_to_dashboard=True, alert_severity="high")

        self.add_monitor(check_name='Performance', frequency=24 * 60 * 60, name='Performance')
