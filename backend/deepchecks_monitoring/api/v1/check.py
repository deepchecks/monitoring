# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""V1 API of the check."""
import typing as t

import pandas as pd
import pendulum
from deepchecks import BaseCheck, Dataset
from deepchecks.core.checks import CheckConfig
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.expression import func
from sqlalchemy.sql.selectable import Select

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.logic.data_tables import (SAMPLE_LABEL_COL, SAMPLE_PRED_LABEL_COL, SAMPLE_PRED_VALUE_COL,
                                                     SAMPLE_TS_COL, get_columns_for_task_type)
from deepchecks_monitoring.models import Check, Model
from deepchecks_monitoring.models.model_version import ModelVersion
from deepchecks_monitoring.utils import exists_or_404, fetch_or_404

from .router import router


class CheckCreationSchema(BaseModel):
    """Check schema."""

    config: CheckConfig
    name: t.Optional[str] = None

    class Config:
        """Schema config."""

        orm_mode = True


@router.post('/models/{model_id}/check')
async def create_check(
    model_id: int,
    check: CheckCreationSchema,
    session: AsyncSession = AsyncSessionDep
):
    """Create a new check.

    Parameters
    ----------
    model_id : int
        ID of the model.
    check : CheckCreationSchema
        Check to create.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    int
        The check id.
    """
    await exists_or_404(session, Model, id=model_id)
    check = Check(model_id=model_id, **check.dict(exclude_none=True))
    session.add(check)
    await session.flush()
    return JSONResponse(content={'id': check.id})


def _create_select_object(model, mon_table: Table, top_feat: t.List[str]) -> Select:
    existing_feat = [feat_name for feat_name in top_feat if hasattr(mon_table.c, feat_name)]
    select_obj: Select = select(*([getattr(mon_table.c, feat_name) for feat_name in existing_feat] +
                                  [getattr(mon_table.c, task_col) for task_col in
                                   get_columns_for_task_type(model.task_type)]))
    return select_obj


def _filter_select_object(select_obj: Select, mon_table: Table,
                          start_look, end_look, n_samples: int = 10_000) -> Select:
    return select_obj.where(getattr(mon_table.c, SAMPLE_TS_COL) < end_look,
                            getattr(mon_table.c, SAMPLE_TS_COL) >= start_look) \
        .order_by(func.random()).limit(n_samples)


def _dataframe_to_dataset_and_pred(df: pd.DataFrame, feat_schema: t.Dict, top_feat: t.List[str]) -> \
        t.Tuple[Dataset, pd.Series, pd.Series]:
    if SAMPLE_PRED_LABEL_COL in df.columns:
        y_pred = df[SAMPLE_PRED_LABEL_COL]
        df.drop(SAMPLE_PRED_LABEL_COL, inplace=True, axis=1)
    else:
        y_pred = None
    if SAMPLE_PRED_VALUE_COL in df.columns:
        y_proba = df[SAMPLE_PRED_VALUE_COL]
        df.drop(SAMPLE_PRED_VALUE_COL, inplace=True, axis=1)
    else:
        y_proba = None
    cat_features = [feat[0] for feat in feat_schema.items() if feat[0] in top_feat and feat[1] == 'categorical']
    dataset = Dataset(df, label=SAMPLE_LABEL_COL, cat_features=cat_features)
    return dataset, y_pred, y_proba


@router.get('/checks/{check_id}/run/{lookback}/')
async def run_check(
    check_id: int,
    lookback: int,
    # filter_segment: t.Optional[str],
    session: AsyncSession = AsyncSessionDep

):
    """Run a check for each time window by lookback.

    Parameters
    ----------
    check_id : int
        ID of the check.
    lookback : int
        Seconds to look back.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    CheckSchema
        Created check.
    """
    # Check if relevant model exists
    curr_time: pendulum.DateTime = pendulum.now().add(minutes=30).set(minute=0, second=0, microsecond=0)
    lookback_durtion = pendulum.duration(seconds=lookback)
    if lookback_durtion < pendulum.duration(days=2):
        window = pendulum.duration(hours=1)
    elif lookback_durtion < pendulum.duration(days=8):
        window = pendulum.duration(days=1)
    else:
        window = pendulum.duration(week=1)
    check = await fetch_or_404(session, Check, id=check_id)
    model_results = await session.execute(select(Model).where(Model.id == check.model_id)
                                          .options(selectinload(Model.versions)))
    model: Model = model_results.scalars().first()
    start_look = curr_time - lookback_durtion
    model_versions: t.List[ModelVersion] = sorted(filter(
        lambda version: start_look <= version.end_time and curr_time >= version.start_time, model.versions),
        key=lambda version: version.end_time, reverse=True)

    assert len(model_versions) > 0

    top_feat, feat_imp = model_versions[0].get_top_features()

    model_versions_sessions = []
    for model_version in model_versions:
        start_look = curr_time - lookback_durtion
        refrence_table = model_version.get_reference_table(session)
        test_table = model_version.get_monitor_table(session)
        refrence_table_data_session = session.execute(_create_select_object(model, refrence_table, top_feat))
        test_data_sessions = []

        select_obj = _create_select_object(model, test_table, top_feat)

        while start_look < curr_time:
            if start_look <= model_version.end_time and start_look + window >= model_version.start_time:
                select_filtered = _filter_select_object(select_obj, test_table, start_look, start_look + window)
                test_data_sessions.append(session.execute(select_filtered))
            else:
                test_data_sessions.append(None)
            start_look = start_look + window
        model_versions_sessions.append((refrence_table_data_session, test_data_sessions))

    for model_versions_session, model_version in zip(model_versions_sessions, model_versions):
        top_feat, feat_imp = model_version.get_top_features()
        test_data_dataframes: t.List[pd.DataFrame] = []
        refrence_table_data_session, test_data_sessions = model_versions_session
        for test_data_session in test_data_sessions:
            if test_data_session is None:
                test_data_dataframes.append(pd.DataFrame())
            else:
                test_data_session = await test_data_session
                test_data_dataframes.append(pd.DataFrame.from_dict(test_data_session.all()))
        refrence_table_data_session = await refrence_table_data_session
        refrence_table_data_dataframe = pd.DataFrame.from_dict(refrence_table_data_session.all())
        reduced_outs = []
        refrence_table_ds, refrence_table_pred, refrence_table_proba = _dataframe_to_dataset_and_pred(
            refrence_table_data_dataframe, model_version.features, top_feat)
        for test_data_dataframe in test_data_dataframes:
            if test_data_dataframe.empty:
                reduced_outs.append(None)
                continue
            test_ds, test_pred, test_proba = _dataframe_to_dataset_and_pred(
                test_data_dataframe, model_version.features, top_feat)
            dp_check = BaseCheck.from_config(check.config)
            reduced = dp_check.run(refrence_table_ds, test_ds, feature_importance=feat_imp,
                                   y_pred_train=refrence_table_pred, y_proba_train=refrence_table_proba,
                                   y_pred_test=test_pred, y_proba_test=test_proba).reduce_output()
            reduced_outs.append(reduced)

    time_windows = []
    start_look = curr_time - lookback_durtion
    while start_look < curr_time:
        time_windows.append(start_look.isoformat())
        start_look = start_look + window

    return {'output': reduced_outs, 'time_labels': time_windows}
