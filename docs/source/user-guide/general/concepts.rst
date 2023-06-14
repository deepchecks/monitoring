==========
Concepts
==========

Deepchecks is a platform for monitoring all your models. A model represents an ML pipeline
performing a single task in production. That could be for example multiple retrained version, all predicting the
Lifetime Value of a customer on your platform.
The model groups together all the model versions that are performing the same task, where the model's versions,
type and the structure of the data may change over time.

A specific version for the model object itself, and the structure of the data it is trained on, is called a
Model Version. A single model can contain multiple versions.

Deepchecks Monitoring monitors your ML system by computing and displaying the results of `Checks <#checks>`__ over time
in the Dashboard screen. `Alert Rules <#alert-rules>`__ can be defined on these results, raising `Alerts <#alerts>`__
when the rules are met.

To dive deeper into the possible root causes of issues detected in the Dashboard screen or the `Alerts <#alerts>`__,
you can run a `Test Suite <#test-suite>`__ for a specific point in time, which will display more detailed results of
different checks run on that time frame.

Several core concepts, such as Checks and the Test Suite are in fact elements of the
:doc:`Deepchecks Testing Package <deepchecks:getting-started/welcome>`, used by Deepchecks Monitoring to test ML system over
time.

All of these monitoring components - Chec:ks, Monitors, Alert Rules and Alerts - are defined on a per-model basis, and
apply for all model versions that belong to a given model.


.. _concepts__checks:

Checks
======

Each check inspects a specific aspect of your data and model. Checks are the basic building blocks of
Deepchecks Monitoring and of the :ref:`Deepchecks Testing Pacakge <deepchecks:general__deepchecks_hierarchy>`.
Each check either computes a quantity on the data, labels and predictions of a specific time frame, or computes a
quantity by comparing these to the data, labels and predictions of the reference dataset.

Few examples for important checks are:

* :ref:`Single Dataset Performance (Computer Vision Version) <deepchecks:vision__single_dataset_performance>` -
   Computes the models' performance for the specified time window using the selected :ref:`metric <deepchecks:metrics_user_guide>`.
* :ref:`Feature Drift (Tabular Version) <deepchecks:tabular__feature_drift>` -
   Computes the data drift between the data distribution in the reference data and the data distribution in the
   specified time window.

Checks also have more elaborate displays, which can be viewed by running the `Test Suite <#test-suite>`__ on a specific
time window.

Please refer to the Deepchecks Testing Package documentation to read more about the available
:ref:`tabular checks <deepchecks:tabular__checks_gallery>`, :ref:`nlp checks <nlp__checks_gallery>` and
:ref:`computer vision checks <deepchecks:vision__checks_gallery>`

Monitors
--------

Monitors are used to show the results of a check over time in the Dashboard screen. A monitor is simply a check
configured to compute results for data within a certain period of time (the "look-back window") with a certain
granularity (the size of the "time window"). You can add new monitors on top of the default ones using the
"Add Monitor" button.

For example, a monitor showing in the Dashboard screen can be the Single Dataset Performance check, configures to
compute and show it's results for each day (the time window) in the past two weeks (the look-back window).

Alert Rules
===========

An Alert Rule is a condition that when met, raises an `Alert <#alerts>`__ on the results of a certain checks. To define
an alert rule we should specify the check, the look-back window, the check calculation interval
(the "Repeat Every" parameter) and the threshold that must be met for the alert to be triggered. The selected
look-back window determines that amount of data the underlying check is run on, while the calculation interval
specifies the frequency in which we should compute the check and apply the Alert Rule condition on its result.

An alert rule is used as a way to notify in real time about possible issues (tested by the various checks) with the
monitored model. For example, a possible alert rule can be "alert if the model accuracy goes below 0.75, with a
look-back window of 1 week and a calculation interval of 1 day". After being defined, this alert rull will each day
aggregate the labels and predictions of the past week, calculate the accuracy for them and creat an
`Alert <#alerts>`__ if that condition is met for a certain day.

Currently, the types of thresholds are:

- Constant threshold - An Alert will be raised for a given time window if the check result in that window is above or
  below the defined numeric threshold.

Alerts
======

Alerts are raised if an Alert Rule has been met, and they represent an issue that should be addressed. A summary of
existing alerts can be seen in the Dashboard screen. Through the alert screen you can inspect alerts in depth, resolve
alerts and edit or delete Alert Rules.

`Alert Rules <#alert-rules>`__ can also be configured so that when an Alert is triggered, a notification is also sent
by Slack or Email to the selected contacts.

For more info about understanding alerts and drilling down to their root cause, 
see the :doc:`Alerts Screen </user-guide/user_interface/alerts>` documentation.


Test Suite
==========

The Test Suite is your way to deep-dive and identify various problems in a specific time window. The Test Suite
is a compilation of the results of a pre-defined list of checks, also used to organize check results in the
:ref:`Deepchecks Testing Package <deepchecks:general__deepchecks_hierarchy>`.

In order to view the results of the Test Suite for a specific time window, select an Alert from the Alert Screen and
then click the Run Test Suite button. You will then be transferred to the html output of the Suite, which contains a
wide array of checks that may indicate the issues with the data or model in the relevant time window.
