=============================
Scorers for Metric Evaluation
=============================

Scorers are the deepchecks way of computing metrics for the model's performance. For each model type there are various
scorers that can be used to evaluate the model's performance. To see the list of available scorers for a specific model
type, please refer to the :doc:`Deepchecks Metrics Guide <deepchecks:metrics_user_guidee>`.

Default Scorers
===============

By default, classification models (both binary and multiclass) are created with accuracy as the default monitored
performance metric. Regression models are created with RMSE as the default monitored performance metric.

Changing Scorers
================

* Editing the scorer used in a monitor is easily accessible through the "edit monitor" button in the monitor's box.
* Editing the scorer being computed by a check in the analysis screen is even easier - just select a different metric
  from the selection box on the right.
