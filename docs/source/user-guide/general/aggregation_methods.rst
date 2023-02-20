.. _aggregation_methods:

===================
Aggregation Methods
===================

Aggregation methods are used in checks that return multiple values, for examples the
:doc:`Feature Drift <deepchecks:checks-gallery/tabular/train_test_validation/plot_train_test_feature_drift>` check
that returns a value for every feature, to aggregate them into a single value.

The following aggregation methods are available:

* Max - The maximum of the scores.
* Mean - The mean of the scores.
* Weighted - The weighted mean of the scores, where the weights are the feature importance values.
* :ref:`L2 Weighted <aggregation_methods__l2_weighted>` (Default).

.. _aggregation_methods__l2_weighted:
L2 Weighted
===========
L2 norm over the combination of per-feature values and feature importance, minus the
L2 norm of feature importance alone, specifically:

``||FEATURE_IMPORTANCE + PER_FEATURE_VALUES|| - ||FEATURE_IMPORTANCE||``

The main benefits of this method are:

* Values for features with high importance are given more weight yet it does not cancel out the
  effect of features with very low importance.
* This method showed the highest correlation with the actual performance degradation (the change that we're
  ultimately trying to predict), when compared with other methods across various use cases.
