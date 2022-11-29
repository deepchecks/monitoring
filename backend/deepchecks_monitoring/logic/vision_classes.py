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

import torch
from deepchecks.vision import ClassificationData, DetectionData, VisionData
from torch.utils.data import Dataset as TorchDataset

from deepchecks_monitoring.schema_models import TaskType


class LabelVisionDataset(TorchDataset):
    """Simple dataset class to supply labels."""

    def __init__(self, labels) -> None:
        self.labels = labels

    def __getitem__(self, index) -> torch.Tensor:
        """Get labels by index."""
        return self.labels[index]

    def __len__(self) -> int:
        """Get length by the amount of labels."""
        return len(self.labels)


class _MyClassificationVisionData(ClassificationData):
    def batch_to_labels(self, batch) -> torch.Tensor:
        return torch.IntTensor(batch).type(torch.int64)


class _MyDetectionVisionData(DetectionData):
    def batch_to_labels(self, batch) -> t.List[torch.Tensor]:
        return batch


TASK_TYPE_TO_VISION_DATA_CLASS: t.Dict[TaskType, t.Type[VisionData]] = \
    {TaskType.VISION_CLASSIFICATION: _MyClassificationVisionData,
     TaskType.VISION_DETECTION: _MyDetectionVisionData}
