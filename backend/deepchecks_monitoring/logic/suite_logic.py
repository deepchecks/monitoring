# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining utility functions for suite running."""

from deepchecks.tabular import checks as tabular_checks
from deepchecks.tabular.suite import Suite as TabularSuite
from pandas import DataFrame
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.logic.check_logic import TimeWindowOption, load_data_for_check
from deepchecks_monitoring.logic.model_logic import dataframe_to_dataset_and_pred
from deepchecks_monitoring.schema_models import ModelVersion, TaskType


def _create_tabular_suite(suite_name: str, task_type: TaskType, has_reference: bool) -> TabularSuite:
    """Create a tabular suite based on provided parameters."""
    checks = [tabular_checks.WeakSegmentsPerformance().add_condition_segments_relative_performance_greater_than(),
              tabular_checks.PercentOfNulls()]
    if task_type == TaskType.REGRESSION:
        checks.append(tabular_checks.RegressionErrorDistribution().add_condition_kurtosis_greater_than())
    else:
        checks.append(tabular_checks.ConfusionMatrixReport())
        checks.append(tabular_checks.RocReport().add_condition_auc_greater_than())

    if has_reference:  # todo: configure conditions based on alerts
        checks.append(tabular_checks.StringMismatchComparison().add_condition_no_new_variants())
        checks.append(tabular_checks.FeatureLabelCorrelationChange().add_condition_feature_pps_difference_less_than())
        checks.append(tabular_checks.TrainTestFeatureDrift().add_condition_drift_score_less_than())
        checks.append(tabular_checks.MultivariateDrift().add_condition_overall_drift_value_less_than())
        checks.append(tabular_checks.TrainTestLabelDrift(ignore_na=True).add_condition_drift_score_less_than())
        checks.append(tabular_checks.TrainTestPredictionDrift().add_condition_drift_score_less_than())
        checks.append(tabular_checks.TrainTestPerformance().add_condition_train_test_relative_degradation_less_than())
    else:
        checks.append(tabular_checks.StringMismatch().add_condition_no_variants())
        checks.append(tabular_checks.FeatureLabelCorrelation().add_condition_feature_pps_less_than())
        checks.append(tabular_checks.FeatureFeatureCorrelation().add_condition_max_number_of_pairs_above_threshold())
        checks.append(tabular_checks.SingleDatasetPerformance())

    for check in checks:
        if hasattr(check, "n_samples"):
            check.n_samples = None

    return TabularSuite(suite_name, *checks)


async def run_suite_for_model_version(model_version: ModelVersion, window_options: TimeWindowOption,
                                      session: AsyncSession = AsyncSessionDep, ):
    """Run a relevant suite for a given window.

    Parameters
    ----------
    model_version : ModelVersion
    window_options : TimeWindowOption
        The window options.
    session : AsyncSession, optional
        SQLAlchemy session.
    """
    top_feat, feat_imp = model_version.get_top_features()
    test_session, ref_session = load_data_for_check(model_version, session, top_feat, window_options)
    if test_session:
        test_session = await test_session
        test_df = DataFrame(test_session.all(), columns=[str(key) for key in test_session.keys()])
    else:
        test_df = DataFrame()
    if ref_session:
        ref_session = await ref_session
        ref_df = DataFrame(ref_session.all(), columns=[str(key) for key in ref_session.keys()])
    else:
        ref_df = DataFrame()
    # The suite takes a long time to run, therefore commit the db connection to not hold it open unnecessarily
    await session.commit()

    suite_name = f"Test Suite - Model {model_version.name} - Window {window_options.end_time_dt().date()}"
    task_type = model_version.model.task_type
    if task_type not in [TaskType.MULTICLASS, TaskType.BINARY, TaskType.REGRESSION]:
        raise Exception(f"Unsupported task type {task_type}")

    suite = _create_tabular_suite(suite_name, task_type, len(ref_df) > 0)
    test_dataset, test_pred, test_proba = dataframe_to_dataset_and_pred(test_df, model_version, top_feat)
    reference_dataset, reference_pred, reference_proba = dataframe_to_dataset_and_pred(ref_df, model_version, top_feat)

    if len(ref_df) == 0:  # if no reference is available, must pass test data as reference (as train)
        reference_dataset, reference_pred, reference_proba = test_dataset, test_pred, test_proba
        test_dataset, test_pred, test_proba = None, None, None

    return suite.run(train_dataset=reference_dataset, test_dataset=test_dataset, feature_importance=feat_imp,
                     y_pred_train=reference_pred, y_proba_train=reference_proba, y_pred_test=test_pred,
                     y_proba_test=test_proba, with_display=True)
