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
# pylint: disable=import-outside-toplevel
"""Module defining the vision client functionality."""
try:
    import torch
    import torchvision
except ImportError as e:
    raise ImportError(
        'In order to work with vision functionality you '
        'need to install "deepchecks[vision]" package along '
        'with "torch" and "torchvision" packages. Check '
        'official documentations on how to do that:\n'
        '- https://docs.deepchecks.com/stable/getting-started/installation.html#deepchecks-for-computer-vision\n'
        '- https://pytorch.org/get-started/locally/\n'
    ) from e
else:
    from deepchecks.vision.task_type import TaskType as DeepchecksTaskType

__all__ = ['DeepchecksTaskType']
