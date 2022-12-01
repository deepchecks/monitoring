# -*- coding: utf-8 -*-
"""
.. _quick_vision:

Quickstart - Get Deepchecks Monitoring Up and Running for Computer Vision Data
******************************************************************************

This quickstart is the perfect starting point for monitoring your vision model using Deepchecks Monitoring. We'll
quickly walk you through setting up a model to represent your task in the system, uploading data, setting the
computed checks and alerts in the system and seeing some results for your effort. We'll be using the
`Mask Detection Dataset <https://www.kaggle.com/datasets/andrewmvd/face-mask-detection>`__, in which
the goal of the model is to detect faces, and classify whether the face is wearing a mask, partially wearing a mask or not wearing a mask.

.. code-block:: bash

    # Before we start, if you don't have deepchecks-client installed yet, run:
    import sys
    !{sys.executable} -m pip install -U deepchecks-client

    # or install using pip from your python environment

Creating a New Model Version
============================

Our first step is to create a new model version in the system. A model in Deepchecks Monitoring
represents an ML pipeline performing a single task in production through time,
where the model's versions and the structure of the data may change over time.
Our terminology to refer to a specific version within a model is "model version".

The easiest way to create a model version, which is demonstrated
here, requires a :doc:`Vision Data <deepchecks:user-guide/vision/data-classes>` object
containing the reference data for the version. Reference data is a dataset to which we wish to compare
our production data stream. Typically, this will be the dataset on which the model was trained.
Providing reference data is optional yet many important :doc:`checks <deepchecks:user-guide/general/deepchecks_hierarchy>`
such as :doc:`Train Test Prediction Drift (Vision Version) <deepchecks:checks_gallery/vision/model_evaluation/plot_train_test_prediction_drift>`
cannot run without it.
"""

# %%
# Preparing the Reference Data
# -------------------------------
#
# In this example we're loading a pre-made VisionData object containing the data at the first time stamp, with which
# the model was trained. In order to create your own VisionData object from your own pytorch dataloader
# please read the :doc:`Vision Data <deepchecks:user-guide/vision/data-classes/index>` documentation or follow the
# appropriate deepchecks computer vision :doc:`quickstart <deepchecks:user-guide/vision/auto_quickstarts/index>`.

from deepchecks.vision.datasets.detection.mask import load_dataset, load_model, get_data_timestamps
ref_dataset = load_dataset(day_index=0, object_type='VisionData', shuffle=False)
model = load_model()

# %%
#
# Predictions must be given in one of the following formats:
#
# 1. A list predictions for each image in the dataset, according to the order they are loaded from the dataloader.
# 2. A dictionary where the values are the predictions and the keys are the image indices in the pytorch Dataset object.

ref_predictions = []
for batch in ref_dataset:
    ref_predictions.extend(list(model(batch[0])))


# %%
# Creating a model version
# ------------------------
# In order to create a model version we must first create an organization in the
# `deepchecks system <https://app.deepchecks.com/>`_ and generate a personal
# API token using the application's dashboard.
#
# .. image:: /_static/images/quickstart/get_api_token.png
#    :width: 600
#
# Using the API token we can now create a new model version and upload the reference data.

import os
import typing as t
import numpy as np
import torch
from deepchecks_client import DeepchecksClient

host = os.environ.get('DEEPCHECKS_API_HOST')  # Replace this with https://app.deepchecks.com
# note to put the API token in your environment variables. Or alternatively (less recommended):
# os.environ['DEEPCHECKS_API_TOKEN'] = 'uncomment-this-line-and-insert-your-api-token-here'
model_name = 'Mask Data'
dc_client = DeepchecksClient(host=host, token=os.getenv('DEEPCHECKS_API_TOKEN'))
model_version = dc_client.create_vision_model_version(model_name=model_name, version_name='v1',
                                                      reference_dataset=ref_dataset,
                                                      reference_predictions=ref_predictions,
                                                      task_type='vision_detection',
                                                      send_images=False)

#%%
# Uploading Production Data
# =========================
#
# No matter what else you'll be doing with Deepchecks Monitoring, it will start by uploading some production data that
# you want monitored. In this the mask data collected for dates ranging from the start of July 2022 to the end of
# August 2022. For simplicity and quicker runtime, we'll upload only the last few days in this tutorial.
# Then, we'll update the labels for some of the samples we uploaded.
#
# Uploading Data and Predictions
# ------------------------------

number_of_batches_to_upload = 5  # Limited to save time running this tutorial
batch_size = 32

# Only upload the last few days.
daily_timestamps = get_data_timestamps()[55:]
# To upload all production data, use:
# daily_timestamps = get_data_timestamps()[1:]
# (Disregard the first day, which is the reference data)


# Defining a helper function that will convert the label format to the one supported by Deepchecks Monitoring.
def extract_label_dict(in_dict: t.Dict[str, torch.Tensor]) -> torch.Tensor:
    return torch.concat([in_dict['labels'].reshape((-1, 1)), in_dict['boxes']], axis=1)


for day_idx, timestamp in enumerate(daily_timestamps):
    # Load the DataLoader for the current day
    data_loader = load_dataset(day_index=day_idx, object_type='DataLoader', batch_size=batch_size)

    for batch_id, batch in enumerate(data_loader):
        # We also upload only a small number of batches in this example to save time.
        # Remove this for loop to upload all data from chosen timestamps.
        if batch_id >= number_of_batches_to_upload:
            break

        indices = [f'{timestamp}_{batch_id}_{i}' for i in range(batch_size)]
        timestamps = [timestamp] * batch_size

        model_version.log_batch(sample_id=indices,
                                timestamps=timestamps,
                                images=[np.array(x.permute(1, 2, 0)) * 255 for x in batch[0]],
                                labels=[extract_label_dict(tensor) for tensor in batch[1]],
                                predictions=model(batch[0])
                                )

#%%
# Images, labels and prediction must be provided in specific required formats.
# The required format for the can be found at :doc:`here <deepchecks:user-guide/vision/data-classes/index>`.
# Please look at the following entries:
#
# - Image format - can be found at :doc:`here <deepchecks:user-guide/vision/data-classes/VisionData>`.
# - Label & prediction format - look at documentation of the respective VisionData subclass according to your task type
#
# In this example, the changes needed in the data format are pretty trivial, but in more complex cases
# you may either implement them in dedicated functions (such as the ``extract_label_dict`` function here), or use
# the ``batch_to_image`` and other formatting methods you already implemented as part of building your
# Deepchecks VisionData object.


#%%
# Updating the Labels
# -------------------
# In many real world scenarios, the labels of the data are only available at a later time. We can update them
# in hindsight using the global sample ids. Here we update the last sample that was uploaded.

model_version.update_sample(sample_id=indices[-1],
                            label=[extract_label_dict(tensor) for tensor in batch[1]][-1])
model_version.send()

#%%
# You can update multiple samples. Once done updating all desired samples, call the `send` method to upload the samples
# and make the updates appear in the system.
#
# When updating multiple samples we can verify that status of the process that is running in the background by checking
# the amount of samples that have been processed and uploaded by the system, using:
# model_version.time_window_statistics(min(prod_data[timestamp]), max(prod_data[timestamp]))
# upon completion, the statistics should equal the total number of samples sent

#%%
# The Dashboard Screen
# ====================
# After creating the model version and uploading the data, we can now see the monitors within the
# `application dashboard <https://app.deepchecks.com/>`_.
# The monitors below are generated by default when a new model is created, all versions of the same model are tracked
# within the same monitor.
#
# .. image:: /_static/images/quickstart/vision_dashboard_w_defaults.png
#    :width: 600
#
# Note: The displayed dashboard was created using all the production data, not only the last few days
#

#%%
# If we wish to remove the model to free up space for new models we can do it in the following way:

# CAUTION: This will delete the model, all model versions, and all associated datasets.
dc_client.delete_model(model_name)
