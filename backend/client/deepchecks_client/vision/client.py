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
import typing as t
import warnings
from collections import defaultdict
from datetime import datetime

import numpy as np
import pandas as pd
import requests
import torch
from deepchecks.vision import VisionData
from deepchecks.vision.checks import (ImagePropertyDrift, SingleDatasetPerformance, TrainTestLabelDrift,
                                      TrainTestPredictionDrift)
from deepchecks.vision.task_type import TaskType as VisTaskType
from deepchecks.vision.utils.image_properties import default_image_properties
from deepchecks.vision.utils.vision_properties import PropertiesInputType
from deepchecks_client.core import ColumnType, TaskType
from deepchecks_client.core import client as core_client
from deepchecks_client.core.client import DeepchecksColumns
from deepchecks_client.core.utils import DeepchecksJsonValidator, create_timestamp, maybe_raise
from deepchecks_client.vision.utils import DeepchecksEncoder, calc_image_bbox_props, create_static_properties


class DeepchecksModelVersionClient(core_client.DeepchecksModelVersionClient):
    """Client to interact with a given model version, including all functions to send data.

    Parameters
    ----------
    session: requests.Session
        The deepchecks monitoring API session.
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
            image_properties: t.Optional[t.List[t.Dict[str, t.Any]]],
    ):
        super().__init__(model_version_id, model, session)
        self.image_properties = image_properties

    def _get_vision_task_type(self):
        task_type = TaskType(self.model['task_type'])
        return VisTaskType.CLASSIFICATION if \
            task_type == TaskType.VISION_CLASSIFICATION else VisTaskType.OBJECT_DETECTION

    def log_sample(self,
                   sample_id: str,
                   img: np.ndarray,
                   timestamp: t.Union[datetime, int, None] = None,
                   prediction=None,
                   label=None):
        """Send sample for the model version.

        Parameters
        ----------
        sample_id: str
            The sample ID
        img: np.ndarray
            the image to log it's predictions, label and properties to
        timestamp: Union[datetime, int]
            If no timezone info is provided on the datetime assumes local timezone.
        prediction
            Prediction value if exists
        label
            label value if exists
        """
        timestamp = create_timestamp(timestamp)
        vis_task_type = self._get_vision_task_type()
        image_props, bbox_props = \
            calc_image_bbox_props([img], [label] if label is not None else None, vis_task_type, self.image_properties)
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
        if label is not None:
            sample[DeepchecksColumns.SAMPLE_LABEL_COL.value] = label

        sample = DeepchecksEncoder.encode(sample)
        DeepchecksJsonValidator(self.schema).validate(sample)

        self._log_samples.append(sample)

    def upload_reference(
            self,
            vision_data: VisionData,
            predictions: t.Optional[t.Dict[int, torch.Tensor]] = None):
        """Upload reference data. Possible to upload only once for a given model version.

        Parameters
        ----------
        vision_data: VisionData
            The vision data that containes the refrense data.
        predictions: Optional[Dict[int, np.ndarray]]
            The predictions for the reference data in format {<index>: <prediction>}.
        """
        if len(vision_data) > 100_000:
            vision_data = vision_data.copy(shuffle=True, n_samples=100_000, random_state=42)
            warnings.warn('Maximum size allowed for reference data is 100,000, applying random sampling')

        static_props = create_static_properties(vision_data, self.image_properties)

        data = defaultdict(dict)
        for i, batch in enumerate(vision_data):
            indexes = list(vision_data.data_loader.batch_sampler)[i]
            labels = dict(zip(indexes, vision_data.batch_to_labels(batch)))
            for ind in indexes:
                data[ind][DeepchecksColumns.SAMPLE_LABEL_COL.value] = DeepchecksEncoder.encode(labels[ind])
                if predictions:
                    data[ind][DeepchecksColumns.SAMPLE_PRED_COL.value] = DeepchecksEncoder.encode(predictions[ind])
                props = static_props[ind]
                for prop_type in props.keys():
                    for prop_name in props[prop_type].keys():
                        data[ind][prop_type + ' ' + prop_name] = DeepchecksEncoder.encode(props[prop_type][prop_name])

        data = pd.DataFrame(data).T
        validator = DeepchecksJsonValidator(schema=self.ref_schema)
        for (_, row) in data.iterrows():
            item = row.to_dict()
            validator.validate(instance=item)

        maybe_raise(
            self.session.post(
                f'model-versions/{self.model_version_id}/reference',
                files={'file': data.to_json(orient='table', index=False)}
            ),
            msg="Reference upload failure.\n{error}"
        )

    def update_sample(self, sample_id: str, img: np.ndarray = None, label=None, **values):
        """Update sample. Possible to update only non_features and label.

        Parameters
        ----------
        sample_id: str
            The sample ID
        img: np.ndarray
            the image to calculate the partial image properties if the label has been updated
        label: Any
            label value if exists
        values:
            any additional values to update
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

        if label is not None and img is not None:
            update[DeepchecksColumns.SAMPLE_LABEL_COL.value] = label
            vis_task_type = self._get_vision_task_type()
            if vis_task_type == VisTaskType.OBJECT_DETECTION:
                image_props, bbox_props = \
                    calc_image_bbox_props([img], [label],
                                        vis_task_type, self.image_properties)
                if image_props:
                    for prop_name, prop_val in image_props.items():
                        update[PropertiesInputType.IMAGES.value + ' ' + prop_name] = prop_val[0]
                if bbox_props:
                    for prop_name, prop_val in bbox_props.items():
                        update[PropertiesInputType.PARTIAL_IMAGES.value + ' ' + prop_name] = prop_val[0]

        update = DeepchecksEncoder.encode(update)
        DeepchecksJsonValidator(schema=optional_columns_schema).validate(update)

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
            vision_data: VisionData = None,
            image_properties: t.List[t.Dict[str, t.Any]] = default_image_properties
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
        if vision_data is None:
            model_version_id = self._get_model_version_id(name)
            if model_version_id is None:
                raise ValueError('Model Version Name does not exists for this model and no vision data were provided.')
        else:
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
        return self._version_client(model_version_id, image_properties=image_properties)

    def _version_client(self,
                        model_version_id: int,
                        image_properties: t.Optional[t.List[t.Dict[str, t.Any]]] = None) \
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
        if self._model_version_clients.get(model_version_id) is None:
            self._model_version_clients[model_version_id] = \
                DeepchecksModelVersionClient(model_version_id, self.model, session=self.session,
                                             image_properties=image_properties)
        return self._model_version_clients[model_version_id]

    def _add_defaults(self):
        """Add default checks, monitors and alerts to a vision model."""
        checks = {
            'Property Drift': ImagePropertyDrift(),
            'Prediction Drift': TrainTestPredictionDrift(),
            'Label Drift': TrainTestLabelDrift(),
        }

        if TaskType(self.model['task_type']) == TaskType.VISION_CLASSIFICATION:
            checks['Performance'] = SingleDatasetPerformance(scorers={'Accuracy': 'accuracy'})
        elif TaskType(self.model['task_type']) == TaskType.VISION_DETECTION:
            checks['Performance'] = SingleDatasetPerformance(scorers={'Precision': 'precision_macro'})
        self.add_checks(checks=checks)

        self.add_alert_rule(check_name="Property Drift", threshold=0.25, frequency=24 * 60 * 60, alert_severity="high",
                            monitor_name="Property Drift", add_monitor_to_dashboard=True)
        self.add_alert_rule(check_name="Prediction Drift", threshold=0.25, frequency=24 * 60 * 60,
                            monitor_name="Prediction Drift", add_monitor_to_dashboard=True, alert_severity="high")
        self.add_alert_rule(check_name="Label Drift", threshold=0.25, frequency=24 * 60 * 60,
                            monitor_name="Label Drift", add_monitor_to_dashboard=True, alert_severity="high")


