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

import numpy as np
import torch
from deepchecks.vision.utils.image_functions import crop_image
from deepchecks.vision.utils.vision_properties import calc_vision_properties
from deepchecks.vision.vision_data import VisionData
from deepchecks_client.core.utils import DeepchecksEncoder as CoreDeepcheckEncoder


class DeepchecksEncoder(CoreDeepcheckEncoder):

    @classmethod
    def encode(cls, obj):
        if isinstance(obj, torch.Tensor):
            if len(obj.shape) > 0:
                tensor_values = obj.cpu().detach().numpy().tolist()
                return tuple(tensor_values)
            return obj.cpu().detach().item()
        return super().encode(obj)


def create_static_predictions(vision_data: VisionData, model, device):
    static_pred = {}
    for i, batch in enumerate(vision_data):
        predictions = vision_data.infer_on_batch(batch, model, device)
        indexes = list(vision_data.data_loader.batch_sampler)[i]
        static_pred.update(dict(zip(indexes, predictions)))
    return static_pred


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
    image_properties: t.Sequence[t.Dict[str, t.Any]]
) -> t.List[t.Dict[str, t.List[float]]]:
    """Calculate samples bboxes properties.
    
    Parameters
    ==========
    images_batch : Sequence[np.ndarray]
        batch of images
    labels_batch : Sequence[np.ndarray]
        batch of images
    image_properties : Sequence[Dict[str, Any]]
        properties to calculate
    
    Returns
    =======
    List[Dict[str, List[float]]] :
        each sample bbox properties
    """
    assert len(image_properties) != 0

    # list[dict[property-name, list[bbox-image-property-value]]]
    bbox_properties = []

    for img, labels in zip(images_batch, labels_batch):
        cropped_images = []
        
        for label in labels:
            label = np.array(DeepchecksEncoder.encode(label))
            x, y, w, h = label[1:]  # bbox
            if is_bbox_collapsed(x, y, w, h):
                continue
            if (img := crop_image(img, x, y, w, h)).size == 0:
                continue
            cropped_images.append(img)
        
        # dict[property-name, list[property-value-per-image]]
        vision_properties = calc_vision_properties(cropped_images, image_properties)
        bbox_properties.append(vision_properties)
    
    return bbox_properties
