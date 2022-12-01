# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining utility classes for vision objects."""
import typing as t

import boto3
import numpy as np
import torch
from deepchecks.core.errors import DeepchecksNotImplementedError
from deepchecks.vision import ClassificationData, DetectionData, VisionData
from torch.utils.data import Dataset as TorchDataset

from deepchecks_monitoring.logic.s3_image_utils import s3_to_cv2_image
from deepchecks_monitoring.schema_models import TaskType


class LabelVisionDataset(TorchDataset):
    """Simple dataset class to supply labels."""

    def __init__(self, labels, s3_images) -> None:
        self.labels = labels
        self.s3_images = s3_images

    def __getitem__(self, index) -> torch.Tensor:
        """Get labels by index."""
        return self.s3_images[index] if self.s3_images else None, self.labels[index]

    def __len__(self) -> int:
        """Get length by the amount of labels."""
        return len(self.labels)


def _batch_to_images(batch, s3_bucket) -> t.Sequence[np.ndarray]:
    if len(batch[0]) == 0 or batch[0][0] is None:
        raise DeepchecksNotImplementedError("haven't given s3 image\n")
    real_images = []
    bucket = boto3.resource("s3").Bucket(s3_bucket)
    for uri in batch[0]:
        img = s3_to_cv2_image(uri, s3_bucket, bucket)
        real_images.append(img)
    return real_images


class _MyClassificationVisionData(ClassificationData):
    def __init__(self, *args, s3_bucket: str, **kwargs):
        self.s3_bucket = s3_bucket
        super().__init__(*args, **kwargs)

    def batch_to_labels(self, batch) -> torch.Tensor:
        return torch.IntTensor(batch[1]).type(torch.int64)

    def batch_to_images(self, batch) -> t.Sequence[np.ndarray]:
        return _batch_to_images(batch, self.s3_bucket)


class _MyDetectionVisionData(DetectionData):
    def __init__(self, *args, s3_bucket: str, **kwargs):
        self.s3_bucket = s3_bucket
        super().__init__(*args, **kwargs)

    def batch_to_labels(self, batch) -> t.List[torch.Tensor]:
        return batch[1]

    def batch_to_images(self, batch) -> t.Sequence[np.ndarray]:
        return _batch_to_images(batch, self.s3_bucket)


TASK_TYPE_TO_VISION_DATA_CLASS: t.Dict[TaskType, t.Type[VisionData]] = \
    {TaskType.VISION_CLASSIFICATION: _MyClassificationVisionData,
     TaskType.VISION_DETECTION: _MyDetectionVisionData}
