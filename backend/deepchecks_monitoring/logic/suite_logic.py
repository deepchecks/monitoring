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
from deepchecks.vision import checks as vision_checks
from deepchecks.vision.suite import Suite as VisionSuite
from pandas import DataFrame
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.dependencies import AsyncSessionDep, S3BucketDep
from deepchecks_monitoring.logic.check_logic import TimeWindowOption, load_data_for_check
from deepchecks_monitoring.logic.model_logic import dataframe_to_dataset_and_pred, dataframe_to_vision_data_pred_props
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
        checks.append(tabular_checks.WholeDatasetDrift().add_condition_overall_drift_value_less_than())
        checks.append(tabular_checks.TrainTestLabelDrift().add_condition_drift_score_less_than())
        checks.append(tabular_checks.TrainTestPredictionDrift().add_condition_drift_score_less_than())
        checks.append(tabular_checks.TrainTestPerformance().add_condition_train_test_relative_degradation_less_than())
    else:
        checks.append(tabular_checks.StringMismatch().add_condition_no_variants())
        checks.append(tabular_checks.FeatureLabelCorrelation().add_condition_feature_pps_less_than())
        checks.append(tabular_checks.FeatureFeatureCorrelation().add_condition_max_number_of_pairs_above_threshold())
        checks.append(tabular_checks.SingleDatasetPerformance())

    return TabularSuite(suite_name, *checks)


def _create_vision_suite(suite_name: str, task_type: TaskType, has_reference: bool) -> VisionSuite:
    """Create a vision suite based on provided parameters."""
    checks = [vision_checks.LabelPropertyOutliers(), vision_checks.ImagePropertyOutliers()]

    if task_type == TaskType.VISION_CLASSIFICATION:
        checks.append(vision_checks.ConfusionMatrixReport())
    elif task_type == TaskType.VISION_DETECTION:
        checks.append(vision_checks.MeanAveragePrecisionReport())

    if has_reference:  # todo: configure conditions based on alerts
        checks.append(vision_checks.PropertyLabelCorrelationChange().add_condition_property_pps_difference_less_than())
        checks.append(vision_checks.ImagePropertyDrift().add_condition_drift_score_less_than())
        checks.append(vision_checks.ImageDatasetDrift().add_condition_drift_score_less_than())
        checks.append(vision_checks.TrainTestLabelDrift().add_condition_drift_score_less_than())
        checks.append(vision_checks.TrainTestPredictionDrift().add_condition_drift_score_less_than())
        checks.append(vision_checks.ClassPerformance().add_condition_train_test_relative_degradation_less_than())
    else:
        checks.append(vision_checks.PropertyLabelCorrelation().add_condition_property_pps_less_than())
        checks.append(vision_checks.SingleDatasetPerformance())

    return VisionSuite(suite_name, *checks)


async def run_suite_for_model_version(
        model_version: ModelVersion,
        window_options: TimeWindowOption,
        session: AsyncSession = AsyncSessionDep,
        s3_bucket: str = S3BucketDep,
):
    """Run a relevant suite for a given window.

    Parameters
    ----------
    model_version : ModelVersion
    window_options : TimeWindowOption
        The window options.
    session : AsyncSession, optional
        SQLAlchemy session.
    s3_bucket: str
        The bucket that is used for s3 images
    """
    top_feat, feat_imp = model_version.get_top_features()
    test_session, ref_session = load_data_for_check(model_version, session, top_feat, window_options)
    if test_session:
        test_session = await test_session
        test_df = DataFrame(test_session.all(), columns=test_session.keys())
    else:
        test_df = DataFrame()
    if ref_session:
        ref_session = await ref_session
        ref_df = DataFrame(ref_session.all(), columns=ref_session.keys())
    else:
        ref_df = DataFrame()
    # The suite takes a long time to run, therefore commit the db connection to not hold it open unnecessarily
    await session.commit()

    suite_name = f"Test Suite - Model {model_version.name} - Window {window_options.start_time_dt().date()}"
    task_type = model_version.model.task_type
    if task_type in [TaskType.MULTICLASS, TaskType.BINARY, TaskType.REGRESSION]:
        suite = _create_tabular_suite(suite_name, task_type, len(ref_df) > 0)
        test_dataset, test_pred, test_proba = dataframe_to_dataset_and_pred(
            test_df, model_version, top_feat)
        reference_dataset, reference_pred, reference_proba = dataframe_to_dataset_and_pred(
            ref_df, model_version, top_feat)

    elif task_type in [TaskType.VISION_DETECTION, TaskType.VISION_CLASSIFICATION]:
        suite = _create_vision_suite(suite_name, task_type, len(ref_df) > 0)
        test_dataset, test_pred, test_proba = \
            dataframe_to_vision_data_pred_props(test_df, task_type, model_version, s3_bucket, use_images=True)
        reference_dataset, reference_pred, reference_proba = \
            dataframe_to_vision_data_pred_props(ref_df, task_type, model_version, s3_bucket, use_images=True)
    else:
        raise Exception(f"Unsupported task type {task_type}")

    if len(ref_df) == 0:  # if no reference is available, must pass test data as reference (as train)
        reference_dataset, reference_pred, reference_proba = test_dataset, test_pred, test_proba
        test_dataset, test_pred, test_proba = None, None, None

    if task_type in [TaskType.BINARY, TaskType.MULTICLASS, TaskType.REGRESSION]:
        return suite.run(train_dataset=reference_dataset, test_dataset=test_dataset, feature_importance=feat_imp,
                         y_pred_train=reference_pred, y_proba_train=reference_proba,
                         y_pred_test=test_pred, y_proba_test=test_proba, with_display=True)
    else:
        suite: VisionSuite
        return suite.run(train_dataset=reference_dataset, test_dataset=test_dataset,
                         train_predictions=reference_pred, train_properties=reference_proba,
                         test_predictions=test_pred, test_properties=test_proba, with_display=True)
