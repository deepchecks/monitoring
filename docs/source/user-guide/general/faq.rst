===
FAQ
===

This FAQ section is about using deepchecks SDK to create a new model and upload your data.
For any other questions and further details about using the SDK, please refer to
the specific user-guide sections, such as the :doc:`tabular setup guide </user-guide/tabular/tabular_setup>`.

Supported Use-Cases & Terminology
=================================

.. collapse:: Which data types and task types are supported?

    * Deepchecks currently supports any ML tasks that work on tabular data types. They can all be monitored for data
      related issues including integrity and drift.
    * For model evaluation, some additional drift checks, and performance monitoring the following tasks are supported
      - Regression, Binary and Multiclass Classification. For more information please visit the
      :ref:`supported models guide <deepchecks:tabular__supported_models>`.

.. collapse:: What is Reference Data?

    * Reference data is compared to the production data in several checks, for purposes such as discovering drift and
      estimating decrease in model performance
      (see :ref:`example <deepchecks:quick_train_test_validation>`).
      In most cases, reference data should the data used to train the model.
    * When either the training data is unavailable or the data distributions of the train and test are
      different it is recommended to use a portion of previous
      production data as the reference data, instead of the training data.

.. collapse:: Can I provide reference data without labels or predictions?

    * Yes, providing reference labels and predictions is optional. However some checks, including prediction and label
      drift, as well as comparative performance metrics, will not run.

.. collapse:: What is a model version?

    * In Deepchecks, a model represents an ML pipeline performing a single task in production. A model version
      represents an instance of the model trained on specific data. Each change in the data schema or in
      the model pipeline must be mapped to a new model version. In most cases, it is recommended to
      create a new model version after each retraining of the model for analysis purposes.
    * For a single model there can be (and usually there will be) several model versions.
    * The timestamps for samples belonging to different model versions can overlap in cases in which multiple model
      versions are deployed simultaneously.

.. collapse:: Can I create a model version without reference data?

    * In short - Yes, providing reference data is optional. However, many checks, including the drift checks,
      require reference data in order to run. It is possible to add the reference data at a later time (see
      :meth:`upload_reference <deepchecks_client.tabular.client.DeepchecksModelVersionClient.upload_reference>`).


.. collapse:: Do I have to provide labels and predictions for my production data?

    * No. Deepchecks aims to provide significant value even without real time labels. Having said that, the label
      drift / prediction drift checks as well as performance metrics will not be available for timestamps in which
      there are no labels / predictions, accordingly.

.. collapse:: Can I have missing values in my data / predictions / labels?

    * Absolutely. Missing values are an integral property of the data and as such should be monitored and analyzed.
      Some checks specifically monitor this information
      (see the
      :doc:`Percent Of Nulls check <deepchecks:checks_gallery/tabular/data_integrity/plot_percent_of_nulls>`)
      and alerts can be configured on top of them.

.. collapse:: What is the sample ID?

    * Sample ID is the global identifier of the sample. It is used to modify the sample, for example to update its
      latent label, and to identify the sample in different data visualizations. As a global identifier, sample ID must
      be unique per sample in a given model version.
    * It is recommended to provide the sample identifier from the database in which it is stored or to generate a UUID
      and store it in a location for later use (such as updating latent label).

.. collapse:: What should the timestamps represent?

    * Deepchecks groups production data based on timestamps. It is recommended to set the timestamp of the data sample to be either the time when the data sample arrived into the system or the time when the model prediction occurred.
    * In either case, **data logging must be done sequentially**. This means that if there is logged data from a week ago
      then we cannot log data whose timestamp is prior to that.

.. collapse:: What is the difference between data and "additional data"?

    * Data represents the information which is fed to the model - such as features for tabular data. Additional data is
      extra information regarding the sample which is not used by the model, for example the data source the sample
      originated from.
    * For tabular data, additional data columns can be explicitly defined within the model schema
      (see :ref:`tabular setup guide <tabular_setup__schema_file>`).
    * Both data and additional data are used by deepchecks monitoring and it is recommended to provide them both for
      maximal value.


Sending Data
============

.. collapse:: Can I update my reference data?

    * No, since reference data is attached to the model version and usually represents the data on which it was trained.
      In order to upload a new reference dataset you need to create a new model version. See
      the :doc:`tabular setup guide </user-guide/tabular/tabular_setup>` for further information.

.. collapse:: What if I have different training and production data distributions?

    * Deepchecks drift checks compare the production data to the reference data in order to produce insights. If
      there is a known reason for why the distributions is different you can handle it in one of the following ways:
       1. Upload a portion of previous production data as the reference data.
       2. Filter or downsample the full reference data so it matches the expected production distribution.
       3. Edit the different monitors to run on segments in which the distribution is expected to be similar.

.. collapse:: Can my reference data have more features than my production data?

    * Yes, if a feature is not present in the production data it will be assigned a missing value for all samples and
      will be ignored by the relevant checks.
    * Note that omitting any features, and especially important ones, will result in the loss of certain
      abilities, such as the ability to detect drift in the feature values.

.. collapse:: Can I monitor non-features / metadata? What are they used for?

    * Yes, Deepchecks allows you to keep track of additional data (see the related question in the
      `Supported Use-Cases & Terminology <#supported-use-cases-terminology>`__ section) which can also provide
      insights in the analysis drill down process. For example they can be used to segment the data for specific
      monitors, and are monitored for data integrity issues.

.. collapse:: Can I update the label of a sample?

    * Yes, using the sample ID the label can be updated at a later time. Note that labels which are updated after an
      alert was calculated for their time window will not affect the alerts, and will only update the visible monitor
      graphs. See :meth:`deepchecks_client.core.client.DeepchecksModelVersionClient.update_sample` for further details.

.. collapse:: I want to add/change a data sample or prediction from the past, what do I do?

    * Data samples and predictions are immutable, and thus they aren't expected to change over time. If you had a
      mistake, or wish to change previous sample uploads for any reasons, it is recommended that you delete them and
      resend new data samples (or delete the entire model version and resend the relevant data). Note that this will
      work for the most recent samples, as data should be sent sequentially.

.. collapse:: Should I send raw data or processed data?

    * You should send data which is as close as possible (in the feature processing pipeline) to the data the model is
      trained on, yet still understandable for a human viewer.
    * It would be better to provide features after normalizations but before applying
      one hot encoding.

.. collapse:: What data should I send?

    * The more data you send the greater the value deepchecks can provide! Specifically, deepchecks can receive data
      (features), labels,  predictions and additional_data (see the related question in the
      `Supported Use-Cases & Terminology <#supported-use-cases-terminology>`__ section).
