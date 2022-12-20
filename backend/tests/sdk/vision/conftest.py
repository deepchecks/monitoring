# import httpx
# import numpy as np
# import pandas as pd
# import pendulum as pdl
# import torch
# import pytest_asyncio
# from deepchecks.vision import ClassificationData, DetectionData
# from torch.utils.data import DataLoader
# from torch.utils.data import Dataset as TorchDataset


# def _batch_collate(batch):
#     imgs, labels = zip(*batch)
#     return list(imgs), list(labels)


# class _VisionDataset(TorchDataset):
#     """Simple dataset class to supply labels."""

#     def __init__(self, imgs, labels) -> None:
#         self.labels = labels
#         self.imgs = imgs

#     def __getitem__(self, index) -> torch.Tensor:
#         """Get labels by index."""
#         return self.imgs[index], self.labels[index]

#     def __len__(self) -> int:
#         """Get length by the amount of labels."""
#         return len(self.labels)


# class _MyClassificationVisionData(ClassificationData):
#     def batch_to_labels(self, batch) -> torch.Tensor:
#         return torch.IntTensor(batch[1])

#     def batch_to_images(self, batch):
#         return batch[0]


# class _MyDetectionVisionData(DetectionData):
#     def batch_to_labels(self, batch) -> t.List[torch.Tensor]:
#         tens_list = []
#         for arr in batch[1]:
#             tens_list.append(torch.Tensor(arr))
#         return tens_list

#     def batch_to_images(self, batch):
#         return batch[0]


# @pytest_asyncio.fixture()
# def vision_classification_and_prediction():
#     imgs = [np.array([[[1, 2, 0], [3, 4, 0]]]),
#             np.array([[[1, 3, 5]]]),
#             np.array([[[7, 9, 0], [9, 6, 0]]])]
#     labels = [2, 0, 1]
#     predictions = {0: [0.1, 0.3, 0.6], 1: [0.6, 0.3, 0.1], 2: [0.1, 0.6, 0.3]}
#     data_loader = DataLoader(_VisionDataset(imgs, labels), batch_size=len(labels), collate_fn=_batch_collate)
#     return _MyClassificationVisionData(data_loader), predictions


# @pytest_asyncio.fixture()
# def vision_classification_and_prediction_big():
#     imgs = [np.array([[[1, 2, 0], [3, 4, 0]]]),
#             np.array([[[1, 3, 5]]]),
#             np.array([[[7, 9, 0], [9, 6, 0]]])] * 50
#     labels = [2, 0, 1] * 50
#     predictions = dict(enumerate([[0.1, 0.3, 0.6], [0.6, 0.3, 0.1], [0.1, 0.6, 0.3]] * 50))
#     data_loader = DataLoader(_VisionDataset(imgs, labels), batch_size=8,
#                              collate_fn=_batch_collate, shuffle=False)
#     return _MyClassificationVisionData(data_loader), predictions


# @pytest_asyncio.fixture()
# def vision_classification_and_list_prediction():
#     imgs = [np.array([[[1, 2, 0], [3, 4, 0]]]),
#             np.array([[[1, 3, 5]]]),
#             np.array([[[7, 9, 0], [9, 6, 0]]])]
#     labels = [2, 0, 1]
#     predictions = [[0.1, 0.3, 0.6], [0.6, 0.3, 0.1], [0.1, 0.6, 0.3]]
#     data_loader = DataLoader(_VisionDataset(imgs, labels), batch_size=len(labels), collate_fn=_batch_collate)
#     return _MyClassificationVisionData(data_loader), predictions


# @pytest_asyncio.fixture()
# def vision_detection_and_prediction_raw():
#     imgs = [np.array([[[1, 2, 0], [3, 4, 0]]]),
#             np.array([[[1, 3, 5]]]),
#             np.array([[[7, 9, 0], [9, 6, 0], [9, 6, 0]],
#                       [[7, 9, 0], [9, 6, 0], [9, 6, 0]],
#                       [[7, 9, 0], [9, 6, 0], [9, 6, 0]],
#                       [[7, 9, 0], [9, 6, 0], [9, 6, 0]]])]
#     labels = [[[1, 0, 0, 1, 1]], [[0, 0, 0, 1, 1]], [[2, 0, 0, 2, 2]]]
#     predictions = {0: [[0, 0, 1, 1, 0.6, 2]], 1: [[0, 0, 1, 1, 0.6, 2]], 2: [[0, 0, 2, 2, 0.6, 2]]}
#     return imgs, labels, predictions


# @pytest_asyncio.fixture()
# def vision_detection_and_prediction(vision_detection_and_prediction_raw):
#     imgs, labels, predictions = vision_detection_and_prediction_raw
#     data_loader = DataLoader(_VisionDataset(imgs, labels), batch_size=len(labels), collate_fn=_batch_collate)
#     return _MyDetectionVisionData(data_loader), predictions


# @pytest.fixture()
# # pylint: disable=unused-argument
# def vision_classification_model_version_client(classification_vision_model_id,
#                                                classification_vision_model_version_id,
#                                                deepchecks_sdk_client: DeepchecksClient):
#     model_client = deepchecks_sdk_client.get_or_create_model(name="vision classification model",
#                                                              task_type=TaskType.VISION_CLASSIFICATION.value)
#     return model_client.version("v1")


# @pytest.fixture()
# # pylint: disable=unused-argument
# def detection_vision_model_version_client(detection_vision_model_id,
#                                           detection_vision_model_version_id,
#                                           deepchecks_sdk_client: DeepchecksClient):
#     model_client = deepchecks_sdk_client.get_or_create_model(name="vision detection model",
#                                                              task_type=TaskType.VISION_DETECTION.value)
#     return model_client.version("v1")
