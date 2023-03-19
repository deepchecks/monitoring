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
* :ref:`L3 Weighted <aggregation_methods__l3_weighted>` (Default).
* :ref:`L5 Weighted <aggregation_methods__l5_weighted>`.

.. _aggregation_methods__l3_weighted:
L3 Weighted
===========
L3 norm over the per-feature values weighted by the feature importance, specifically:

``|FEATURE_IMPORTANCE * PER_FEATURE_VALUES^3|^(1/3)``

Note that for this method, the feature importance values are normalized to sum to 1.

The main benefits of this method are:

* Values for features with high importance are given more weight yet it does not cancel out the
  effect of features with very low importance.
* This method showed the highest correlation with the actual performance degradation (the change that we're
  ultimately trying to predict), when compared with other methods across various use cases.

.. _aggregation_methods__l5_weighted:
L5 Weighted
===========
Similar to the :ref:`L3 Weighted <aggregation_methods__l3_weighted>` method, but using the L5 norm:

``|FEATURE_IMPORTANCE * PER_FEATURE_VALUES^5|^(1/5)``

In comparison to the L3 method, this method gives less weight to the feature importance thus it is recommended
to use this method when your model is sensitive to drift in features with low importance. In addition, this method
returns higher values the the :ref:`L3 Weighted <aggregation_methods__l3_weighted>` method, so if chosen it is
recommended to update the default alert threshold accordingly.
