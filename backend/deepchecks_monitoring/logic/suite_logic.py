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

from deepchecks.tabular.suite import Suite as TabularSuite
from deepchecks.tabular.suites import production_suite
from pandas import DataFrame
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.logic.check_logic import TimeWindowOption, load_data_for_check
from deepchecks_monitoring.logic.model_logic import dataframe_to_dataset_and_pred
from deepchecks_monitoring.schema_models import Model, ModelVersion, TaskType


def _create_tabular_suite(suite_name: str, task_type: TaskType, has_reference: bool) -> TabularSuite:
    """Create a tabular suite based on provided parameters."""
    suite = production_suite(task_type, is_comparative=has_reference)

    suite.name = suite_name

    for check_name in suite.checks:
        if hasattr(suite.checks[check_name], "n_samples"):
            suite.checks[check_name].n_samples = None

    return suite


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
    model: Model = model_version.model
    test_session, ref_session = load_data_for_check(model_version, session, top_feat, window_options,
                                                    with_labels=True)
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
    task_type = model.task_type
    if task_type not in [TaskType.MULTICLASS, TaskType.BINARY, TaskType.REGRESSION]:
        raise Exception(f"Unsupported task type {task_type}")

    suite = _create_tabular_suite(suite_name, task_type, len(ref_df) > 0)
    test_dataset, test_pred, test_proba = dataframe_to_dataset_and_pred(
        test_df,
        model_version,
        model,
        top_feat,
        dataset_name="Production",
    )
    reference_dataset, reference_pred, reference_proba = dataframe_to_dataset_and_pred(
        ref_df,
        model_version,
        model,
        top_feat,
        dataset_name="Reference",
    )

    if len(ref_df) == 0:  # if no reference is available, must pass test data as reference (as train)
        reference_dataset, reference_pred, reference_proba = test_dataset, test_pred, test_proba
        test_dataset, test_pred, test_proba = None, None, None

    return suite.run(train_dataset=reference_dataset, test_dataset=test_dataset, feature_importance=feat_imp,
                     y_pred_train=reference_pred, y_proba_train=reference_proba, y_pred_test=test_pred,
                     y_proba_test=test_proba, with_display=True)
