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
import torch
from deepchecks.vision import VisionData
from deepchecks.vision.checks import (ImagePropertyDrift, SingleDatasetPerformance, TrainTestLabelDrift,
                                      TrainTestPredictionDrift)
from deepchecks.vision.task_type import TaskType as VisionTaskType
from deepchecks.vision.utils.image_properties import default_image_properties
from deepchecks.vision.utils.vision_properties import PropertiesInputType
from deepchecks_client.core import ColumnType, TaskType
from deepchecks_client.core import client as core_client
from deepchecks_client.core.api import API
from deepchecks_client.core.utils import DeepchecksColumns, DeepchecksJsonValidator, parse_timestamp, pretty_print
from deepchecks_client.vision.utils import (DeepchecksEncoder, calc_additional_and_default_vision_properties,
                                            calc_bbox_properties, properties_schema)

ARRAY = t.TypeVar('ARRAY', np.ndarray, torch.Tensor)


class DeepchecksModelVersionClient(core_client.DeepchecksModelVersionClient):
    """Client to interact with a given model version, including all functions to send data.

    Parameters
    ----------
    session : httpx.Client
        The deepchecks monitoring API session.
    model_version_id : int
        The id of the model version.
    additional_image_properties : Optional[List[Dict[str, Any]]]
        The additional image properties to use for the reference.
    """

    model_version_id: int
    schema: dict
    ref_schema: dict

    def __init__(
            self,
            model_version_id: int,
            model: dict,
            api: API,
            additional_image_properties: t.Optional[t.List[t.Dict[str, t.Any]]],
    ):
        super().__init__(model_version_id, model, api)
        self.additional_image_properties = additional_image_properties

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
        ----------
        sample_id : Sequence[str]
            Sequence of keys that uniquely identify each sample
        images : Sequence[numpy.ndarray]
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
            raise ValueError('"samples_per_send" must be ">=" than 1')

        if any(v != 1 for v in Counter(sample_id).values()):
            raise ValueError('"sample_id" must contain unique values')

        if len(images) == 0:
            raise ValueError('"images" cannot be empty')

        n_of_sample = len(images)
        error_template = 'number of rows/items in each given parameter must be the same yet{additional}'

        if n_of_sample != len(sample_id):
            raise ValueError(error_template.format(additional=' len(sample_id) != len(images)'))
        if n_of_sample != len(timestamps):
            raise ValueError(error_template.format(additional=' len(timestamps) != len(images)'))

        data: t.Dict[str, t.Sequence[t.Any]] = {
            'img': images,
            'timestamp': timestamps,
            'sample_id': sample_id
        }

        if predictions is not None:
            if n_of_sample != len(predictions):
                raise ValueError(error_template.format(additional=' len(predictions) != len(images)'))
            else:
                data['prediction'] = predictions

        if labels is not None:
            if n_of_sample != len(labels):
                raise ValueError(error_template.format(additional=' len(labels) != len(images)'))
            else:
                data['label'] = labels

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
        """Add a data sample for the model version update queue. Requires a call to send() to upload.

        The required format for the supplied images, predictions and labels can be found at
        https://docs.deepchecks.com/stable/user-guide/vision/data-classes/index.html
        Please look at the following entries:
        - image format - https://docs.deepchecks.com/stable/user-guide/vision/data-classes/VisionData.html
        - label & prediction format - look at documentation of the respective VisionData subclass according to your task
          type

        Parameters
        ----------
        sample_id : str
            The sample ID
        img : np.ndarray
            The image to log it's predictions, labels and properties to
        timestamp : Union[datetime, int]
            If no timezone info is provided on the datetime assumes local timezone.
        prediction
            Prediction value or predicted probability if exists, according to the expected format for the task type.
        label
            labels value if exists, according to the expected format for the task type.
        """
        if timestamp is None:
            warnings.warn('log_sample was called without timestamps, using current time instead')

        task_type = self._get_vision_task_type()
        additional_image_properties = self.additional_image_properties

        timestamp = parse_timestamp(timestamp) if timestamp is not None else pdl.now()
        images_batch = [img]
        labels_batch = [label] if label is not None else None
        properties_fields = {}

        if calculated_properties := calc_additional_and_default_vision_properties(images_batch,
                                                                                  additional_image_properties):
            for name, values in calculated_properties.items():
                properties_fields[image_property_field(name)] = values[0]  # we have only one image (only one value)

        if task_type == VisionTaskType.OBJECT_DETECTION and labels_batch:
            bbox_properties = calc_bbox_properties(images_batch, labels_batch, additional_image_properties)
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
            predictions: t.Optional[t.Union[t.Dict[int, ARRAY], t.List[ARRAY]]] = None,
            samples_per_request: int = 5000,
    ):
        """Upload reference data. Possible to upload only once for a given model version.

        Parameters
        ----------
        vision_data : VisionData
            The vision data that contains the reference data.
        predictions : Dict[int, torch.Tensor / np.ndarray]] / List[torch.Tensor / np.ndarray]], default: None
            The predictions for the reference data in format {<index>: <predictions>} or [<predictions>]. If the
            predictions are passed as a list, the order of the predictions must be the same as the order of the samples
            returned by the dataloader of the vision data. If the predictions are passed as a dictionary, the keys must
            be the indexes of the samples in the dataset from which the vision data dataloader was created.
        samples_per_request : int, default: 5000
            How many samples to send in each request. Decrease this number if having problems uploading the data.
        """
        if vision_data.num_samples > 100_000:
            vision_data = vision_data.copy(shuffle=True, n_samples=100_000, random_state=42)
            warnings.warn('Maximum size allowed for reference data is 100,000, applying random sampling')

        data = defaultdict(dict)
        task_type = self._get_vision_task_type()
        samples_indexes = list(vision_data.data_loader.batch_sampler)
        prediction_field = DeepchecksColumns.SAMPLE_PRED_COL.value
        label_field = DeepchecksColumns.SAMPLE_LABEL_COL.value

        running_sample_index = 0
        for i, batch in enumerate(vision_data):
            indexes = samples_indexes[i]
            images_batch = vision_data.batch_to_images(batch)
            labels_batch = vision_data.batch_to_labels(batch)
            task_type = vision_data.task_type
            batch_length = len(images_batch)

            # dict[property-name, list[image-1-value, ..., image-N-value]]
            image_properties = calc_additional_and_default_vision_properties(images_batch,
                                                                             self.additional_image_properties)

            # list[dict[property-name, list[bbox-1-value, ..., bbox-N-value]]]
            # bbox properties for each sample
            bbox_properties = (
                calc_bbox_properties(images_batch, labels_batch, self.additional_image_properties)
                if task_type == VisionTaskType.OBJECT_DETECTION
                else None
            )

            for sample_batch_index, sample_index in enumerate(indexes):
                data[sample_index][label_field] = DeepchecksEncoder.encode(labels_batch[sample_batch_index])

                if predictions:
                    if isinstance(predictions, dict):
                        data[sample_index][prediction_field] = DeepchecksEncoder.encode(predictions[sample_index])
                    else:
                        data[sample_index][prediction_field] = DeepchecksEncoder.encode(
                            predictions[running_sample_index + sample_batch_index]
                        )

                for name, values in image_properties.items():
                    data[sample_index][image_property_field(name)] = DeepchecksEncoder.encode(
                        values[sample_batch_index])

                if bbox_properties:
                    for name, values in bbox_properties[sample_batch_index].items():
                        data[sample_index][bbox_property_field(name)] = DeepchecksEncoder.encode(values)

            running_sample_index += batch_length

        data = pd.DataFrame(data).T

        for _, row in data.iterrows():
            self.ref_schema_validator.validate(instance=row.to_dict())

        self._upload_reference(
            data=data,
            samples_per_request=samples_per_request
        )
        pretty_print('Reference data uploaded.')

    def update_sample(
        self,
        sample_id: str,
        image: t.Optional[np.ndarray] = None,
        label: t.Any = None,
        **values
    ):
        """Update an existing sample. Adds the sample to the update queue. Requires a call to send() to upload.

        Parameters
        ----------
        sample_id : str
            The sample ID
        image : t.Optional[np.ndarray], default: None
            image to be attached to the provided sample id. required if updating the label for a object detection task.
        label : Any, default: None
            updated label for the sample.
        values
            any additional values to update
        """
        # Create update schema, which contains only non-required columns and sample id
        required_columns = set(self.schema['required'])
        optional_columns_schema = {
            'type': 'object',
            'properties': {k: v for k, v in self.schema['properties'].items()
                           if k not in required_columns or k == DeepchecksColumns.SAMPLE_ID_COL.value},
            'required': [DeepchecksColumns.SAMPLE_ID_COL.value],
            'additionalProperties': False
        }

        update = {DeepchecksColumns.SAMPLE_ID_COL.value: sample_id, **values}

        if image is not None:
            img_properties = calc_additional_and_default_vision_properties([image], self.additional_image_properties)
            for name, values in img_properties.items():
                update[image_property_field(name)] = values[0]  # we have only one image (only one value)

        if label is not None:
            update[DeepchecksColumns.SAMPLE_LABEL_COL.value] = label
            task_type = self._get_vision_task_type()
            # TODO: change to task_type not classification later
            if task_type == VisionTaskType.OBJECT_DETECTION:
                if image is None:
                    raise ValueError(f'For {task_type.value} task, updating label require also passing an image')
                bbox_properties = calc_bbox_properties([image], [label], self.additional_image_properties)
                # we have only one image (only one value with bbox properties)
                for name, values in bbox_properties[0].items():
                    update[bbox_property_field(name)] = list(values)

        update = DeepchecksEncoder.encode(update)
        DeepchecksJsonValidator(schema=optional_columns_schema).validate(update)
        self.api.update_samples(self.model_version_id, [update])


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
            vision_data: t.Optional[VisionData] = None,
            additional_image_properties: t.Optional[t.List[t.Dict[str, t.Any]]] = None
    ) -> DeepchecksModelVersionClient:
        """Create a new model version for vision data.

        Parameters
        ----------
        name : str
            The name of the new version.
        vision_data : VisionData
            The vision data to use as reference.
        additional_image_properties : List[Dict[str, Any]]
            The additional image properties to use for the reference.
            Should be in format:
                [{'name': <str>, 'method': <callable>, 'output_type': <'continuous'/'discrete'/'class_id'>}]
            See https://docs.deepchecks.com/stable/user-guide/vision/vision_properties.html for more info.

        Returns
        -------
        DeepchecksModelVersionClient
            Client to interact with the newly created version.
        """
        existing_version_id = self._get_existing_version_id_or_none(version_name=name)

        if existing_version_id is not None:
            return self._version_client(existing_version_id, additional_image_properties=additional_image_properties)

        if vision_data is None:
            raise ValueError('Model Version Name does not exists for this model and no vision data were provided.')
        else:
            # Start with validation
            if additional_image_properties is not None:
                DeepchecksJsonValidator(properties_schema).validate(additional_image_properties)

            features = {}
            all_image_props = additional_image_properties or [] + default_image_properties
            for prop in all_image_props:
                prop_name = prop['name']
                features[PropertiesInputType.IMAGES.value + ' ' + prop_name] = ColumnType.NUMERIC.value
                if vision_data.task_type == VisionTaskType.OBJECT_DETECTION:
                    features[PropertiesInputType.PARTIAL_IMAGES.value + ' ' + prop_name] = ColumnType.ARRAY_FLOAT.value

            # Send request
            created_version = self.api.create_model_version(
                model_id=self.model['id'],
                model_version={
                    'name': name,
                    'features': features,
                    'non_features': {},
                }
            )
            created_version = t.cast(t.Dict[str, t.Any], created_version)
            model_version_id = created_version['id']

        return self._version_client(model_version_id, additional_image_properties=additional_image_properties)

    def _version_client(
        self,
        model_version_id: int,
        additional_image_properties: t.Optional[t.List[t.Dict[str, t.Any]]] = None
    ) -> DeepchecksModelVersionClient:
        """Get client to interact with a given version of the model.

        Parameters
        ----------
        model_version_id : int
        additional_image_properties : Optional[List[Dict[str, Any]]]
            The additional image properties to use for the reference.

        Returns
        -------
        DeepchecksModelVersionClient
        """
        if self._model_version_clients.get(model_version_id) is None:
            self._model_version_clients[model_version_id] = DeepchecksModelVersionClient(
                model_version_id,
                self.model,
                api=self.api,
                additional_image_properties=additional_image_properties
            )
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

        self.add_alert_rule(check_name='Property Drift', threshold=0.25, frequency=24 * 60 * 60, alert_severity='high',
                            monitor_name='Property Drift', add_monitor_to_dashboard=True)
        self.add_alert_rule(check_name='Prediction Drift', threshold=0.25, frequency=24 * 60 * 60,
                            monitor_name='Prediction Drift', add_monitor_to_dashboard=True, alert_severity='high')
        self.add_alert_rule(check_name='Label Drift', threshold=0.25, frequency=24 * 60 * 60,
                            monitor_name='Label Drift', add_monitor_to_dashboard=True, alert_severity='high')
        self.add_monitor(check_name='Performance', frequency=24 * 60 * 60, name='Performance')


def image_property_field(name: str) -> str:
    """Form image property field name."""
    return f'{PropertiesInputType.IMAGES.value} {name}'


def bbox_property_field(name: str) -> str:
    """Form bbox property field name."""
    return f'{PropertiesInputType.PARTIAL_IMAGES.value} {name}'
