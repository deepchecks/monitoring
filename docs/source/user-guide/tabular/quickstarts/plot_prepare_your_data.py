# -*- coding: utf-8 -*-
"""
.. _prepare_your_tabular_data:

Preparing Your Tabular Data for Deepchecks Monitoring
*****************************************************

What You Need to Get Through the Tutorial
=========================================
The in order to start monitoring your tabular data and model using Deepchecks you will need to have the following
pre-requisites:

* Data which can be loaded into a pandas DataFrame. This can be a csv file, a database connection or any other.
* A timestamp column in your data. This column will be used to identify the time of the sample and will be used to
  monitor the data over time. In most cases, the time of the model prediction will be a good choice.
* A working python environment with deepchecks and deepchecks-client installed. See
  :doc:`quickstart guide </user-guide/tabular/auto_quickstarts/plot_quickstart>` for additional details.

All the pre-requisites are fulfilled? Great! Let's get started.

Preparing Your Data
===================
In this short tutorial we'll go over the required steps in order to prepare your data
for Deepchecks Monitoring which include:

1. :ref:`Preparing the Reference Data <prepare_your_tabular_data__reference_data>` (Optional)
2. :ref:`Creating a Data Schema <prepare_your_tabular_data__data_schema>`
3. :ref:`Preparing the Production Data <prepare_your_tabular_data__production_data>`
4. :ref:`Supplying Model Predictions <prepare_your_tabular_data__model_predictions>` (Optional)

After this tutorial you will have a ready to go setup in order to start monitoring your data and model using
Deepchecks. See :doc:`Setup Guide </user-guide/tabular/tabular_setup>` for a follow-up tutorial on
setting up your monitoring system.

In this tutorial we will use the `Lending Club loan data
<https://www.kaggle.com/datasets/wordsforthewise/lending-club>`__ which is stored in two csv files, one containing the
data used for the model training (reference data) and the other containing the production data. It is preferable to run
this tutorial on your own data or one that you are familiar with.

"""

# %%
# .. _prepare_your_tabular_data__reference_data:
# Preparing the Reference Data (Optional)
# ---------------------------------------
#
# Reference data represent the data used for model training and is required in order to run checks which compare
# the production data to the reference data. An example of such a check is the
# :doc:`Feature Drift <deepchecks:checks_gallery/tabular/train_test_validation/plot_train_test_feature_drift>` check.
#
# We will load the reference data from a csv file and use it to create a
# :ref:`Dataset <deepchecks:tabular__dataset_object>` object which is used in order to create the
# data schema and upload the reference data to the monitoring system.

import pandas as pd

train_df = pd.read_csv('https://figshare.com/ndownloader/files/39316160')
train_df.head(2)

# %%
# So what do we have? Let's note the special columns in our data:
#
# 1. issue_d - The timestamp of the sample (This is unnecessary for reference data, but is required for production data)
# 2. id - the id of the loan application
# 3. loan_status - Our label, which is the final status of the loan. 0 means "paid in full", and 1 are defaults.
#
# All the other columns are features that can be used by our model to predict whether the user will default or not.
#
# In order to create a Dataset object we must specify the name of the label column and which features are categorical.
# If the data contains a datetime column, index column or other columns which are not features, we need to also pass
# a features argument containing the features column names.

from deepchecks.tabular import Dataset

features = train_df.columns.drop(['id', 'issue_d', 'loan_status'])
cat_features = ['sub_grade', 'home_ownership', 'term', 'purpose', 'application_type', 'verification_status',
                'addr_state', 'initial_list_status']
ref_dataset = Dataset(train_df, cat_features=cat_features, features=features, label='loan_status')
ref_dataset

# %%
# .. _prepare_your_tabular_data__data_schema:
#
# Creating the Data Schema
# ------------------------
# Schema file contains the description of the data (features and additional data) associated with a model version and
# is used by the monitoring system to validate the production data.
# **It is highly recommended to review the created schema file before moving forward to creating the model version.**

from deepchecks_client import create_schema, read_schema

schema_file_path = 'schema_file.yaml'
create_schema(dataset=ref_dataset, schema_output_file=schema_file_path)
read_schema(schema_file_path)
# Note: for conveniently changing the auto-inferred schema it's recommended to edit the textual file with an
# app of your choice.
# After editing, you can use the `read_schema` function to verify the validity of the syntax in your updated schema.

# %%
# .. _prepare_your_tabular_data__production_data:
#
# Preparing the Production Data
# -----------------------------
#
# In order to prepare the production data we will take a closer look at index and datetime columns which are
# required for production data but not for reference data.
#
# The index is the global identifier for a sample in the deepchecks system and is used in various displays
# as well as for future updates of the sample as well. It is crucial to provide meaningful values for this column.
# In our case we will use the id column as the index.
#
# The timestamps represent either the time the sample was observed or the time the model prediction took place.
# It should be provided in Unix timestamp format (seconds since 1970-01-01 00:00:00 UTC). In our case we will use
# the issue_d column and convert it to the required format.

from time import time

prod_data = pd.read_csv('https://figshare.com/ndownloader/files/39316157', parse_dates=['issue_d'])
# Convert pandas datetime format to unix timestamp
prod_data['issue_d'] = prod_data['issue_d'].astype(int) // 10 ** 9
# we will varify that the index column is unique and that the datetime column is in the correct format
assert prod_data.index.is_unique
assert prod_data['issue_d'].min() > 0 and prod_data['issue_d'].max() < int(time())

# %%
# .. _prepare_your_tabular_data__model_predictions:
#
# Supplying Model Predictions
# ---------------------------
#
# If we wish to also monitor the model's behaviour we need to provide the model's predictions for both
# the reference and production data in the required format and optionally also the model feature importance.
#
# Currently, model predictions are only supported for regression and classification tasks. For classification tasks,
# it is preferable to provide the predicted probabilities per class rather than the predicted classes themselves.
#

# Loading the model (CatBoost Classifier)
import joblib
from urllib.request import urlopen

with urlopen('https://figshare.com/ndownloader/files/39316172') as f:
    model = joblib.load(f)

# Extracting feature importance - optional
feature_importance = pd.Series(model.feature_importances_ / sum(model.feature_importances_), index=model.feature_names_)

# Predicting on the reference data and production data
ref_predictions = model.predict_proba(train_df[features].fillna('NONE'))
prod_predictions = model.predict_proba(prod_data[features].fillna('NONE'))

# sphinx_gallery_thumbnail_path = '_static/images/sphinx_thumbnails/quickstarts/prepare-data-guide-book.png'
