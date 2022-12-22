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
import base64
import typing as t
import warnings
from collections import defaultdict
from datetime import datetime

import cv2
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
from deepchecks_client.core.utils import (ColumnTypeName, DeepchecksColumns, DeepchecksJsonValidator, parse_timestamp,
                                          pretty_print, validate_additional_data_schema)
from deepchecks_client.vision.utils import (DeepchecksEncoder, calc_additional_and_default_vision_properties,
                                            calc_bbox_properties, properties_schema, rearrange_and_validate_batch,
                                            validate_label_map)

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
    send_images : bool , default True
        If to send images to the server
    """

    model_version_id: int
    schema: dict
    ref_schema: dict
    _ref_samples_uploaded: int
    send_images: bool

    def __init__(
            self,
            model_version_id: int,
            model: dict,
            api: API,
            additional_image_properties: t.Optional[t.List[t.Dict[str, t.Any]]],
            send_images: bool = True,
    ):
        super().__init__(model_version_id, model, api)
        self.additional_image_properties = additional_image_properties
        self.send_images = send_images
        # TODO: use label_map to validate if the prediction/label values is correct
        self.label_map = \
            t.cast(t.Dict[str, t.Any], self.api.fetch_model_version_schema(model_version_id))['label_map']
        self._ref_samples_uploaded = \
            t.cast(t.Dict[str, int], self.api.get_samples_count(self.model_version_id))['reference_count']

    def _reformat_sample(
            self,
            img: np.ndarray,
            sample_id: str = None,
            timestamp: t.Union[datetime, int, str, None] = None,
            prediction=None,
            label=None,
            additional_data: t.Dict[str, t.Any] = None,
            is_ref_sample: bool = False,
    ) -> dict:
        """Reformat the user output to our columns types and encode it.

        Parameters
        ----------
        sample_id : str
            The sample ID
        img : np.ndarray
            The image to log it's predictions, labels and properties to
        timestamp : Union[datetime, int, str, None]
            Can be one of:
                - int: Unix timestamp
                - str: timestamp in ISO8601 format
                - datetime: If no timezone info is provided on the datetime assumes local timezone.
                - None: will use current time
        prediction
            Prediction value or predicted probability if exists, according to the expected format for the task type.
        label
            labels value if exists, according to the expected format for the task type.
        additional_data: Dict[str, Any], default: None
            Additional data to add.
        is_ref_sample : bool , default False
            If it is used for reference data
        Returns
        -------
        dict
            {<column_type>: <value>}
        """
        task_type = self._get_vision_task_type()
        additional_image_properties = self.additional_image_properties

        images_batch = [img]
        labels_batch = [label] if label is not None else None
        properties_fields = {}

        calculated_properties = calc_additional_and_default_vision_properties(images_batch,
                                                                              additional_image_properties)
        if calculated_properties:
            for name, values in calculated_properties.items():
                properties_fields[image_property_field(name)] = values[0]  # we have only one image (only one value)

        if task_type == VisionTaskType.OBJECT_DETECTION and labels_batch:
            bbox_properties = calc_bbox_properties(images_batch, labels_batch, additional_image_properties)
            # we have only one image (only one value with bbox properties)
            for name, values in bbox_properties[0].items():
                properties_fields[bbox_property_field(name)] = list(values)

        sample = {**properties_fields}
        if not is_ref_sample:
            sample[DeepchecksColumns.SAMPLE_ID_COL.value] = str(sample_id)
            sample[DeepchecksColumns.SAMPLE_TS_COL.value] = parse_timestamp(timestamp).to_iso8601_string()

        if prediction is not None:
            sample[DeepchecksColumns.SAMPLE_PRED_COL.value] = prediction
        if label is not None:
            sample[DeepchecksColumns.SAMPLE_LABEL_COL.value] = label

        if additional_data is not None:
            sample.update(additional_data)

        sample = DeepchecksEncoder.encode(sample)
        if is_ref_sample:
            self.ref_schema_validator.validate(sample)
        else:
            self.schema_validator.validate(sample)

        if self.send_images:
            img = cv2.imencode('.jpeg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 60])[1]
            sample[DeepchecksColumns.SAMPLE_S3_IMAGE_COL.value] = base64.b64encode(img.tostring()).decode('utf-8')

        return sample

    def _get_vision_task_type(self):
        task_type = TaskType(self.model['task_type'])
        return (
            VisionTaskType.CLASSIFICATION
            if task_type == TaskType.VISION_CLASSIFICATION
            else VisionTaskType.OBJECT_DETECTION
        )

    def upload_reference_batch(
            self,
            images: t.Sequence[np.ndarray],
            predictions: t.Union[t.Sequence[t.Any], t.Sequence[t.Any], None] = None,
            labels: t.Union[t.Sequence[t.Any], t.Sequence[t.Any], None] = None,
            additional_data: t.Optional[t.Sequence[t.Dict[str, t.Any]]] = None,
            samples_per_request: int = 32
    ):
        """Upload a batch of reference data - data should be shuffled (only a total of 100k samples can be uploaded).

        The required format for the supplied images, predictions and labels can be found at
        https://docs.deepchecks.com/stable/user-guide/vision/data-classes/index.html
        Please look at the following entries:
        - image format - https://docs.deepchecks.com/stable/user-guide/vision/data-classes/VisionData.html
        - label & prediction format - look at documentation of the respective VisionData subclass according to your task
          type

        Parameters
        ----------
        images : Sequence[numpy.ndarray]
            Sequence of images
        predictions : Optional[Union[Sequence[str], Sequence[float]]] , default None
            Sequence of predictions or predicted probabilities, according to the expected format for the task type.
        labels : Optional[Union[Sequence[str], Sequence[float]]] , default None
            Sequence of labels, according to the expected format for the task type.
        additional_data : Optional[Sequence[Dict[str, Any]]] , default None
            Sequence of additional data in format [{<name>: <value>}]
        samples_per_request : int , default 32
            How many samples to send by one request
        """
        if samples_per_request < 1:
            raise ValueError('"samples_per_request" must be more than 0')

        if len(images) > core_client.MAX_REFERENCE_SAMPLES - self._ref_samples_uploaded:
            if self._ref_samples_uploaded >= core_client.MAX_REFERENCE_SAMPLES:
                warnings.warn(f'Already uploaded {self._ref_samples_uploaded} samples, cannot upload more samples.')
                return
            upload_size = core_client.MAX_REFERENCE_SAMPLES - self._ref_samples_uploaded
            images = images[upload_size:]
            if labels is not None:
                labels = labels[upload_size:]
            if predictions is not None:
                predictions = predictions[upload_size:]
            warnings.warn(f'Maximum size allowed for reference data is 100,000, will use first {upload_size} samples.')

        samples = rearrange_and_validate_batch(images=images, predictions=predictions, labels=labels,
                                               additional_data=additional_data,
                                               is_ref_samples=True)
        data = {i: self._reformat_sample(is_ref_sample=True, **sample) for i, sample in enumerate(samples)}
        self._upload_reference(
            data=pd.DataFrame(data).T,
            samples_per_request=samples_per_request
        )
        self._ref_samples_uploaded += len(data)
        pretty_print('Batch uploaded, total number of reference samples in system is'
                     f' {self.api.get_samples_count(self.model_version_id)["reference_count"]}.')

    def log_batch(
            self,
            sample_id: t.Sequence[str],
            images: t.Sequence[np.ndarray],
            timestamps: t.Union[t.Sequence[int], t.Sequence[datetime], t.Sequence[str]],
            predictions: t.Union[t.Sequence[t.Any], t.Sequence[t.Any], None] = None,
            labels: t.Union[t.Sequence[t.Any], t.Sequence[t.Any], None] = None,
            additional_data: t.Optional[t.Sequence[t.Dict[str, t.Any]]] = None,
            samples_per_send: int = 32
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
        timestamps : Union[Sequence[datetime], Sequence[int], Sequence[str]]
            samples timestamps. a timestamp can be one of:
                - int: Unix timestamp
                - str: timestamp in ISO8601 format
                - datetime: If no timezone info is provided on the datetime assumes local timezone.
                - None: will use current time
        predictions : Optional[Union[Sequence[str], Sequence[float]]] , default None
            Sequence of predictions or predicted probabilities, according to the expected format for the task type.
        labels : Optional[Union[Sequence[str], Sequence[float]]] , default None
            Sequence of labels, according to the expected format for the task type.
        additional_data : Optional[Sequence[Dict[str, Any]]] , default None
            Sequence of additional data in format [{<name>: <value>}]
        samples_per_send : int , default 32
            How many samples to send by one request
        """
        if samples_per_send < 1:
            raise ValueError('"samples_per_send" must be more than 0')

        samples = rearrange_and_validate_batch(images=images, sample_id=sample_id,
                                               timestamps=timestamps, predictions=predictions, labels=labels,
                                               additional_data=additional_data)

        for i in range(0, len(sample_id), samples_per_send):
            self._log_batch(samples[i:i + samples_per_send])

    def _log_batch(self, samples: t.Sequence[t.Dict[str, t.Any]]):
        for sample in samples:
            self.log_sample(**sample)
        self.send()

    def log_sample(
            self,
            sample_id: str,
            img: np.ndarray,
            timestamp: t.Union[datetime, int, str, None] = None,
            prediction=None,
            label=None,
            additional_data: t.Dict[str, t.Any] = None,
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
        timestamp : Union[datetime, int, str, None]
            Can be one of:
                - int: Unix timestamp
                - str: timestamp in ISO8601 format
                - datetime: If no timezone info is provided on the datetime assumes local timezone.
                - None: will use current time
        prediction
            Prediction value or predicted probability if exists, according to the expected format for the task type.
        label
            labels value if exists, according to the expected format for the task type.
        additional_data : [Dict[str, Any] , default None
            additional data in format {<name>: <value>}
        """
        if timestamp is None:
            warnings.warn('log_sample was called without timestamps, using current time instead')
        timestamp = parse_timestamp(timestamp) if timestamp is not None else pdl.now()
        sample = self._reformat_sample(img=img, sample_id=sample_id, timestamp=timestamp,
                                       prediction=prediction, label=label, additional_data=additional_data)
        self._log_samples.append(sample)

    def upload_reference(
            self,
            vision_data: VisionData,
            predictions: t.Optional[t.Union[t.Dict[int, ARRAY], t.List[ARRAY]]] = None,
            additional_data: t.Optional[t.Dict[int, t.Dict[str, t.Any]]] = None,
            samples_per_request: int = 32,
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
        additional_data : Dict[int, Dict[str, Any]], default: None
            The additional data in a format of {<index>: {<name>: <value>}}.
            The keys must be the indexes of the samples in the dataset
            from which the vision data dataloader was created.
        samples_per_request : int, default: 32
            How many samples to send in each request. Decrease this number if having problems uploading the data.
        """
        if vision_data.num_samples > core_client.MAX_REFERENCE_SAMPLES - self._ref_samples_uploaded:
            if self._ref_samples_uploaded >= core_client.MAX_REFERENCE_SAMPLES:
                warnings.warn(f'Already uploaded {self._ref_samples_uploaded} samples, cannot upload more samples.')
                return
            vision_data = vision_data.copy(shuffle=True,
                                           n_samples=core_client.MAX_REFERENCE_SAMPLES - self._ref_samples_uploaded,
                                           random_state=42)
            warnings.warn('Maximum size allowed for reference data is 100,000, applying random sampling')
            if self._ref_samples_uploaded > 0:
                warnings.warn(f'Already uploaded {self._ref_samples_uploaded} samples, '
                              f'will use {core_client.MAX_REFERENCE_SAMPLES - self._ref_samples_uploaded} now.')

        data = defaultdict(dict)
        samples_indexes = list(vision_data.data_loader.batch_sampler)

        running_sample_index = 0
        for i, batch in enumerate(vision_data):
            indexes = samples_indexes[i]
            images_batch = vision_data.batch_to_images(batch)
            labels_batch = vision_data.batch_to_labels(batch)

            for sample_index, img, label in zip(indexes, images_batch, labels_batch):
                if isinstance(predictions, dict):
                    prediction = predictions[sample_index]
                else:
                    prediction = predictions[running_sample_index]
                additional_data_value = additional_data[sample_index] if additional_data is not None else None
                data[sample_index] = self._reformat_sample(img=img, label=label, prediction=prediction,
                                                           additional_data=additional_data_value,
                                                           is_ref_sample=True)
                running_sample_index += 1

        self._upload_reference(
            data=pd.DataFrame(data).T,
            samples_per_request=samples_per_request
        )
        self._ref_samples_uploaded += len(data)
        pretty_print('Reference data uploaded.')


class DeepchecksModelClient(core_client.DeepchecksModelClient):
    """Client to interact with a vision model in monitoring."""

    def version(
            self,
            name: str,
            additional_image_properties: t.Optional[t.List[t.Dict[str, t.Any]]] = None,
            additional_data_schema: t.Optional[t.Dict[str, ColumnTypeName]] = None,
            label_map: t.Optional[t.Dict[int, str]] = None,
            send_images: bool = True,
    ) -> DeepchecksModelVersionClient:
        """Create a new model version for vision data.

        Parameters
        ----------
        name : str
            The name of the new version.
        additional_image_properties : List[Dict[str, Any]]
            The additional image properties to use for the reference.
            Should be in format:
                [{'name': <str>, 'method': <callable>, 'output_type': <'continuous'/'discrete'/'class_id'>}]
            See https://docs.deepchecks.com/stable/user-guide/vision/vision_properties.html for more info.
        label_map : Dict[int, str], optional
            A dictionary mapping class ids to their names to be displayed in the different monitors.
        additional_data_schema : Dict[str, ColumnTypeName], optional
            Schema for the additional data to add - in a format of {<name>: <ColumnData.value>}.
            Additional data is used for segmentation and filtering.
        send_images : bool , default True
            If to send images to the server

        Returns
        -------
        DeepchecksModelVersionClient
            Client to interact with the newly created version.
        """
        if additional_image_properties is not None:
            DeepchecksJsonValidator(properties_schema).validate(additional_image_properties)

        validate_label_map(label_map)

        features = {}
        all_image_props = additional_image_properties or default_image_properties
        task_type = TaskType(self.model['task_type'])

        for prop in all_image_props:
            prop_name = prop['name']
            features[PropertiesInputType.IMAGES.value + ' ' + prop_name] = ColumnType.NUMERIC.value
            if task_type == TaskType.VISION_DETECTION:
                features[PropertiesInputType.PARTIAL_IMAGES.value + ' ' + prop_name] = ColumnType.ARRAY_FLOAT.value

        validate_additional_data_schema(additional_data_schema, features)

        existing_version_id = self._get_existing_version_id_or_none(version_name=name)
        if existing_version_id is not None:
            version_client = self._version_client(existing_version_id,
                                                  additional_image_properties=additional_image_properties,
                                                  send_images=send_images)
            version_client.validate(features=features, label_map=label_map, additional_data=additional_data_schema)
            return version_client

        created_version = self.api.create_model_version(
            model_id=self.model['id'],
            model_version={
                'name': name,
                'features': features,
                'label_map': label_map,
                'additional_data': additional_data_schema or {},
            }
        )

        created_version = t.cast(t.Dict[str, t.Any], created_version)
        model_version_id = created_version['id']
        return self._version_client(model_version_id, additional_image_properties=additional_image_properties,
                                    send_images=send_images)

    def _version_client(
        self,
        model_version_id: int,
        additional_image_properties: t.Optional[t.List[t.Dict[str, t.Any]]] = None,
        send_images: bool = True,
    ) -> DeepchecksModelVersionClient:
        """Get client to interact with a given version of the model.

        Parameters
        ----------
        model_version_id : int
        additional_image_properties : Optional[List[Dict[str, Any]]]
            The additional image properties to use for the reference.
        send_images : bool , default True
            If to send images to the server

        Returns
        -------
        DeepchecksModelVersionClient
        """
        if self._model_version_clients.get(model_version_id) is None:
            self._model_version_clients[model_version_id] = DeepchecksModelVersionClient(
                model_version_id,
                self.model,
                api=self.api,
                additional_image_properties=additional_image_properties,
                send_images=send_images
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
