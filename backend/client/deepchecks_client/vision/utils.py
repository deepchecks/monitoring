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
#
import math

import torch
from deepchecks.vision.task_type import TaskType
from deepchecks.vision.utils.image_functions import crop_image
from deepchecks.vision.utils.vision_properties import calc_vision_properties
from deepchecks.vision.vision_data import VisionData

from deepchecks_client.core.utils import DeepchecksEncoder


class DeepchecksVisionEncoder(DeepchecksEncoder):
    def default(self, obj):
        obj = super().default(obj)
        if isinstance(obj, torch.Tensor):
            tensor_values = obj.cpu().detach().numpy().tolist()
            return tuple([self.default(v) for v in tensor_values])
        return obj


def create_static_predictions(vision_data: VisionData, model, device):
    static_pred = {}
    for i, batch in enumerate(vision_data):
        predictions = vision_data.infer_on_batch(batch, model, device)
        indexes = list(vision_data.data_loader.batch_sampler)[i]
        static_pred.update(dict(zip(indexes, predictions)))
    return static_pred


def _vision_props_to_static_format(indexes, vision_props):
    index_properties = dict(zip(indexes, [dict(zip(vision_props, t)) for t in zip(*vision_props.values())]))
    return index_properties


def calc_image_bbox_props(batch_imgs, batch_labels, task_type, image_properties):
    image_props = calc_vision_properties(batch_imgs, image_properties)
    if task_type == TaskType.OBJECT_DETECTION and batch_labels is not None:
        bbox_props_list = []
        count = 0
        for img, labels in zip(batch_imgs, batch_labels):
            imgs = []
            for label in labels:
                label = label.cpu().detach().numpy()
                bbox = label[1:]
                # make sure image is not out of bounds
                if math.floor(bbox[2]) == 0 or math.floor(bbox[3]) == 0 or math.floor(bbox[2]) + min(math.floor(bbox[0]), 0) -1 <= 0 or \
                        math.floor(bbox[3]) <= 0 + min(math.floor(bbox[1]), 0) -1:
                    continue
                imgs.append(crop_image(img, *bbox))
            count += len(imgs)
            bbox_props_list.append(calc_vision_properties(imgs, image_properties))
        bbox_props = {k: [dic[k] for dic in bbox_props_list] for k in bbox_props_list[0]}
        return image_props, bbox_props
    return image_props, None


def create_static_properties(vision_data: VisionData, image_properties):
    static_prop = {}
    for i, batch in enumerate(vision_data):
        indexes = list(vision_data.data_loader.batch_sampler)[i]
        batch_imgs = vision_data.batch_to_images(batch)
        batch_labels = vision_data.batch_to_labels(batch)
        task_type = vision_data.task_type
        image_props, bbox_props = calc_image_bbox_props(batch_imgs, batch_labels, task_type, image_properties)
        static_image_prop = _vision_props_to_static_format(indexes, image_props)
        if bbox_props is not None:
            static_bbox_prop = _vision_props_to_static_format(indexes, bbox_props)
            static_prop.update({k: {'images': static_image_prop[k],
                                    'partial_images': static_bbox_prop[k]} for k in indexes})
        else:
            static_prop.update({k: {'images': static_image_prop[k]} for k in indexes})
    return static_prop
