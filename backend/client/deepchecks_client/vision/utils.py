# ----------------------------------------------------------------------------
# Copyright (C) 2021 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#
import math
import typing as t
from collections import Counter
from datetime import datetime

import numpy as np
import pandas as pd
import torch
from deepchecks.tabular import Dataset
from deepchecks.vision.utils.image_functions import crop_image
from deepchecks.vision.utils.image_properties import calc_default_image_properties, default_image_properties
from deepchecks.vision.utils.vision_properties import calc_vision_properties
from deepchecks.vision.vision_data import VisionData
from deepchecks_client.core.utils import ColumnTypeName
from deepchecks_client.core.utils import DeepchecksEncoder as CoreDeepcheckEncoder
from deepchecks_client.core.utils import describe_dataset


class DeepchecksEncoder(CoreDeepcheckEncoder):

    @classmethod
    def encode(cls, obj):
        if isinstance(obj, torch.Tensor):
            if len(obj.shape) > 0:
                tensor_values = obj.cpu().detach().numpy().tolist()
                return tuple(tensor_values)
            return obj.cpu().detach().item()
        return super().encode(obj)


def validate_label_map(label_map):
    if label_map is not None:
        if not isinstance(label_map, dict):
            raise ValueError(f'label_map must be a dict but got type {type(label_map)}')
        for key, val in label_map.items():
            if not isinstance(key, int):
                raise ValueError(f'Keys in label_map must be an int but got type {type(key)}')
            if not isinstance(val, str):
                raise ValueError(f'Values in label_map must be an int but got type {type(val)}')


def rearrange_and_validate_batch(
    images: t.Sequence[np.ndarray],
    sample_id: t.Sequence[str] = None,
    timestamps: t.Union[t.Sequence[int], t.Sequence[datetime]] = None,
    predictions: t.Union[t.Sequence[t.Any], t.Sequence[t.Any], None] = None,
    labels: t.Union[t.Sequence[t.Any], t.Sequence[t.Any], None] = None,
    additional_data: t.Optional[t.Sequence[t.Dict[str, t.Any]]] = None,
    is_ref_samples: bool = False,
) -> t.List[t.Dict[str, t.Any]]:
    """Rearrange all the properties for the samples to a single list and validate it.

    Parameters
    ----------
    images : Sequence[numpy.ndarray]
        Sequence of images
    sample_id : Sequence[str] , default None
        Sequence of keys that uniquely identify each sample
    timestamps : Union[Sequence[datetime], Sequence[int]]
        samples timestamps
    predictions : Optional[Union[Sequence[str], Sequence[float]]] , default None
        Sequence of predictions or predicted probabilities, according to the expected format for the task type.
    labels : Optional[Union[Sequence[str], Sequence[float]]] , default None
        Sequence of labels, according to the expected format for the task type.
    additional_data : Optional[Sequence[Dict[str, Any]]] , default None
            Sequence of additional data in format [{<name>: <value>}]
    is_ref_samples : bool , default False
        If it is used for reference data

    Returns
    -------
    t.List[t.Dict[str, t.Any]]
        the samples in a single list
    """

    if len(images) == 0:
        raise ValueError('"images" cannot be empty')

    n_of_sample = len(images)
    error_template = 'number of rows/items in each given parameter must be the same yet{additional}'

    data: t.Dict[str, t.Sequence[t.Any]] = {'img': images}

    if not is_ref_samples:
        if any(v != 1 for v in Counter(sample_id).values()):
            raise ValueError('"sample_id" must contain unique values')
        if n_of_sample != len(sample_id):
            raise ValueError(error_template.format(additional=' len(sample_id) != len(images)'))
        if n_of_sample != len(timestamps):
            raise ValueError(error_template.format(additional=' len(timestamps) != len(images)'))
        data['sample_id'] = sample_id
        data['timestamp'] = timestamps

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

    if labels is not None:
        if n_of_sample != len(labels):
            raise ValueError(error_template.format(additional=' len(labels) != len(images)'))
        else:
            data['label'] = labels

    if additional_data is not None:
        if n_of_sample != len(additional_data):
            raise ValueError(error_template.format(additional=' len(additional_data) != len(images)'))
        else:
            data['additional_data'] = additional_data

    samples = zip(*data.values())
    samples = [dict(zip(data.keys(), sample)) for sample in samples]
    return samples


def create_static_predictions(vision_data: VisionData, model, device):
    static_pred = {}
    for i, batch in enumerate(vision_data):
        predictions = vision_data.infer_on_batch(batch, model, device)
        indexes = list(vision_data.data_loader.batch_sampler)[i]
        static_pred.update(dict(zip(indexes, predictions)))
    return static_pred


def calc_additional_and_default_vision_properties(images: t.Sequence[np.ndarray],
                                                  additional_image_properties: t.Sequence[t.Dict[str, t.Any]]) \
        -> t.Dict[str, list]:
    """Helper function to calculate the default properties and the additional properties."""
    if len(images) == 0:
        vision_properties = {}
        for prop in additional_image_properties or [] + default_image_properties:
            vision_properties[prop['name']] = []
        return vision_properties
    vision_properties: t.Dict[str, list] = calc_default_image_properties(images)
    if additional_image_properties is not None:
        vision_properties.update(calc_vision_properties(images, additional_image_properties))
    return vision_properties


def is_bbox_collapsed(x: float, y: float, w: float, h: float) -> bool:
    return (
        math.floor(w) == 0
        or math.floor(h) == 0
        or math.floor(w) + min(math.floor(x), 0) - 1 <= 0
        or math.floor(h) <= 0 + min(math.floor(y), 0) - 1
    )


def calc_bbox_properties(
    images_batch: t.Sequence[np.ndarray],
    labels_batch: t.Sequence[np.ndarray],
    additional_image_properties: t.Sequence[t.Dict[str, t.Any]]
) -> t.List[t.Dict[str, t.List[float]]]:
    """Calculate samples bboxes properties.

    Parameters
    ----------
    images_batch : Sequence[np.ndarray]
        batch of images
    labels_batch : Sequence[np.ndarray]
        batch of images
    additional_image_properties : Sequence[Dict[str, Any]]
        properties to calculate

    Returns
    -------
    List[Dict[str, List[float]]]
        each sample bbox properties
    """
    # list[dict[property-name, list[bbox-image-property-value]]]
    bbox_properties = []

    for img, labels in zip(images_batch, labels_batch):
        cropped_images = []

        for label in labels:
            label = np.array(DeepchecksEncoder.encode(label))
            x, y, w, h = label[1:]  # bbox
            if is_bbox_collapsed(x, y, w, h):
                continue
            img = crop_image(img, x, y, w, h)
            if img.size == 0:
                continue
            cropped_images.append(img)

        # dict[property-name, list[property-value-per-image]]
        vision_properties = calc_additional_and_default_vision_properties(cropped_images, additional_image_properties)
        bbox_properties.append(vision_properties)

    return bbox_properties


def infer_additional_data_schema(additional_data: t.Union[pd.DataFrame, t.Dict[int, t.Dict[str, t.Any]]]) \
        -> t.Dict[str, ColumnTypeName]:
    """Infer schema for vision additional_data."""
    if isinstance(additional_data, dict):
        additional_data = pd.DataFrame(additional_data).T
    return describe_dataset(Dataset(additional_data, features=[]))['additional_data']


properties_schema = {
    'type': 'array',
    'items': {'properties': {
        'method': {'type': 'callable'},
        'name': {'type': 'string'},
        'output_type': {'type': 'string'},
    }},
}
