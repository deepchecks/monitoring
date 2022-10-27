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
from collections import Counter, defaultdict
from datetime import datetime

import numpy as np
import pandas as pd
import pendulum as pdl
import requests
import torch
from deepchecks.vision import VisionData
from deepchecks.vision.checks import (ImagePropertyDrift, SingleDatasetPerformance, TrainTestLabelDrift,
                                      TrainTestPredictionDrift)
from deepchecks.vision.task_type import TaskType as VisionTaskType
from deepchecks.vision.utils.image_properties import default_image_properties
from deepchecks.vision.utils.vision_properties import PropertiesInputType, calc_vision_properties
from deepchecks_client.core import ColumnType, TaskType
from deepchecks_client.core import client as core_client
from deepchecks_client.core.utils import DeepchecksColumns, DeepchecksJsonValidator, maybe_raise, parse_timestamp
from deepchecks_client.vision.utils import DeepchecksEncoder, calc_bbox_properties


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
        return (
            VisionTaskType.CLASSIFICATION
            if task_type == TaskType.VISION_CLASSIFICATION
            else VisionTaskType.OBJECT_DETECTION
        )

    def log_batch(
            self,
            sample_id: t.Sequence[str],
            images: t.Sequence[np.ndarray],
            timestamps: t.Union[t.Sequence[int], t.Sequence[datetime]],
            predictions: t.Union[t.Sequence[t.Any], t.Sequence[t.Any], None] = None,
            labels: t.Union[t.Sequence[t.Any], t.Sequence[t.Any], None] = None,
            samples_per_send: int = 100_000
    ):
        """Log a batch of images.

        The required format for the supplied images, predictions and labels can be found at
        https://docs.deepchecks.com/stable/user-guide/vision/data-classes/index.html
        Please look at the following entries:
        - image format - https://docs.deepchecks.com/stable/user-guide/vision/data-classes/VisionData.html
        - label & prediction format - look at documentation of the respective VisionData subclass according to your task
          type

        Parameters
        ==========
        sample_id : Sequence[str]
            Sequence of keys that uniquely identify each sample
        images: Sequence[numpy.ndarray]
            Sequence of images
        timestamps : Union[Sequence[datetime], Sequence[int]]
            samples timestamps
        predictions : Optional[Union[Sequence[str], Sequence[float]]] , default None
            Sequence of predictions or predicted probabilities, according to the expected format for the task type.
        labels : Optional[Union[Sequence[str], Sequence[float]]] , default None
            Sequence of labels, according to the expected format for the task type.
        samples_per_send : int , default 100_000
            How many samples to send by one request
        """
        if samples_per_send < 1:
            raise ValueError("'samples_per_send' must be '>=' than 1")

        if any(v != 1 for v in Counter(sample_id).values()):
            raise ValueError("'sample_id' must contain unique values")

        if len(images) == 0:
            raise ValueError("'images' cannot be empty")

        n_of_sample = len(images)
        error_template = "number of rows/items in each given parameter must be the same yet{additional}"

        if n_of_sample != len(sample_id):
            raise ValueError(error_template.format(additional=" len(sample_id) != len(images)"))
        if n_of_sample != len(timestamps):
            raise ValueError(error_template.format(additional=" len(timestamps) != len(images)"))

        data: t.Dict[str, t.Sequence[t.Any]] = {
            "img": images,
            "timestamp": timestamps,
            "sample_id": sample_id
        }

        if predictions is not None:
            if n_of_sample != len(predictions):
                raise ValueError(error_template.format(additional=" len(predictions) != len(images)"))
            else:
                data["prediction"] = predictions

        if labels is not None:
            if n_of_sample != len(labels):
                raise ValueError(error_template.format(additional=" len(labels) != len(images)"))
            else:
                data["label"] = labels

        samples = zip(*data.values())
        samples = [dict(zip(data.keys(), sample)) for sample in samples]

        for i in range(0, len(data), samples_per_send):
            self._log_batch(samples[i:i + samples_per_send])

    def _log_batch(self, samples: t.Sequence[t.Dict[str, t.Any]]):
        for sample in samples:
            self.log_sample(**sample)
        self.send()

    def log_sample(
            self,
            sample_id: str,
            img: np.ndarray,
            timestamp: t.Union[datetime, int, None] = None,
            prediction=None,
            label=None
    ):
        """Send sample for the model version.

        The required format for the supplied images, predictions and labels can be found at
        https://docs.deepchecks.com/stable/user-guide/vision/data-classes/index.html
        Please look at the following entries:
        - image format - https://docs.deepchecks.com/stable/user-guide/vision/data-classes/VisionData.html
        - label & prediction format - look at documentation of the respective VisionData subclass according to your task
          type

        Parameters
        ----------
        sample_id: str
            The sample ID
        img: np.ndarray
            The image to log it's predictions, labels and properties to
        timestamp: Union[datetime, int]
            If no timezone info is provided on the datetime assumes local timezone.
        prediction
            Prediction value or predicted probability if exists, according to the expected format for the task type.
        label
            labels value if exists, according to the expected format for the task type.
        """
        assert self.image_properties is not None

        if timestamp is None:
            warnings.warn("log_sample was called without timestamps, using current time instead")

        task_type = self._get_vision_task_type()
        image_properties = self.image_properties

        timestamp = parse_timestamp(timestamp) if timestamp is not None else pdl.now()
        images_batch = [img]
        labels_batch = [label] if label is not None else None
        properties_fields = {}

        if calculated_properties := calc_vision_properties(images_batch, image_properties):
            for name, values in calculated_properties.items():
                properties_fields[image_property_field(name)] = values[0]  # we have only one image (only one value)

        if task_type == VisionTaskType.OBJECT_DETECTION and labels_batch:
            bbox_properties = calc_bbox_properties(images_batch, labels_batch, image_properties)
            # we have only one image (only one value with bbox properties)
            for name, values in bbox_properties[0].items():
                properties_fields[bbox_property_field(name)] = list(values)

        sample = {
            DeepchecksColumns.SAMPLE_ID_COL.value: str(sample_id),
            DeepchecksColumns.SAMPLE_TS_COL.value: timestamp.to_iso8601_string(),
            **properties_fields
        }

        if prediction is not None:
            sample[DeepchecksColumns.SAMPLE_PRED_COL.value] = prediction
        if label is not None:
            sample[DeepchecksColumns.SAMPLE_LABEL_COL.value] = label

        sample = DeepchecksEncoder.encode(sample)
        self.schema_validator.validate(sample)
        self._log_samples.append(sample)

    def upload_reference(
            self,
            vision_data: VisionData,
            predictions: t.Optional[t.Dict[int, torch.Tensor]] = None,
            samples_per_request: int = 5000,
    ):
        """Upload reference data. Possible to upload only once for a given model version.

        Parameters
        ----------
        vision_data: VisionData
            The vision data that containes the refrense data.
        predictions: Optional[Dict[int, np.ndarray]]
            The predictions for the reference data in format {<index>: <predictions>}.
        """
        if vision_data.num_samples > 100_000:
            vision_data = vision_data.copy(shuffle=True, n_samples=100_000, random_state=42)
            warnings.warn('Maximum size allowed for reference data is 100,000, applying random sampling')

        data = defaultdict(dict)
        task_type = self._get_vision_task_type()
        samples_indexes = list(vision_data.data_loader.batch_sampler)
        prediction_field = DeepchecksColumns.SAMPLE_PRED_COL.value
        label_field = DeepchecksColumns.SAMPLE_LABEL_COL.value

        assert self.image_properties is not None

        for i, batch in enumerate(vision_data):
            indexes = samples_indexes[i]
            images_batch = vision_data.batch_to_images(batch)
            labels_batch = vision_data.batch_to_labels(batch)
            task_type = vision_data.task_type

            # dict[property-name, list[image-1-value, ..., image-N-value]]
            image_properties = calc_vision_properties(images_batch, self.image_properties)

            # list[dict[property-name, list[bbox-1-value, ..., bbox-N-value]]]
            # bbox properties for each sample
            bbox_properties = (
                calc_bbox_properties(images_batch, labels_batch, self.image_properties)
                if task_type == VisionTaskType.OBJECT_DETECTION
                else None
            )

            for sample_batch_index, sample_index in enumerate(indexes):
                data[sample_index][label_field] = DeepchecksEncoder.encode(labels_batch[sample_batch_index])

                if predictions:
                    data[sample_index][prediction_field] = DeepchecksEncoder.encode(predictions[sample_index])

                for name, values in image_properties.items():
                    data[sample_index][image_property_field(name)] = DeepchecksEncoder.encode(
                        values[sample_batch_index])

                if bbox_properties:
                    for name, values in bbox_properties[sample_batch_index].items():
                        data[sample_index][bbox_property_field(name)] = DeepchecksEncoder.encode(values)

        data = pd.DataFrame(data).T

        for _, row in data.iterrows():
            self.ref_schema_validator.validate(instance=row.to_dict())
        
        self._upload_reference(
            data=data,
            samples_per_request=samples_per_request
        )
    
    def update_sample(self, sample_id: str, img: np.ndarray = None, label=None, **values):
        """Update sample. Possible to update only non_features and labels.

        Parameters
        ----------
        sample_id: str
            The sample ID
        img: np.ndarray
            the image to calculate the partial image properties if the labels has been updated
        label: Any
            labels value if exists
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
            task_type = self._get_vision_task_type()
            images_batch = [img]
            labels_batch = [label]

            if task_type == VisionTaskType.OBJECT_DETECTION:
                img_properties = calc_vision_properties(images_batch, self.image_properties)
                bbox_properties = calc_bbox_properties(images_batch, labels_batch, self.image_properties)

                for name, values in img_properties.items():
                    update[image_property_field(name)] = values[0]  # we have only one image (only one value)

                # we have only one image (only one value with bbox properties)
                for name, values in bbox_properties[0].items():
                    update[bbox_property_field(name)] = list(values)

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
        existing_version_id = self._get_existing_version_id_or_none(version_name=name)
        if existing_version_id is not None:
            return self._version_client(existing_version_id, image_properties=image_properties)

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
                if vision_data.task_type == VisionTaskType.OBJECT_DETECTION:
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
        self.add_monitor(check_name='Performance', frequency=24 * 60 * 60, name='Performance')


def image_property_field(name: str) -> str:
    """Form image property field name."""
    return f"{PropertiesInputType.IMAGES.value} {name}"


def bbox_property_field(name: str) -> str:
    """Form bbox property field name."""
    return f"{PropertiesInputType.PARTIAL_IMAGES.value} {name}"
