# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining functions for getting statistic info on the data."""
from typing import Dict, List

from sqlalchemy import Column, and_, case, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.logic.check_logic import SingleWindowMonitorOptions
from deepchecks_monitoring.models import ModelVersion
from deepchecks_monitoring.models.column_type import ColumnType


async def bins_for_feature(model_version: ModelVersion, feature: str, session: AsyncSession,
                           monitor_options: SingleWindowMonitorOptions, num_bins=10) -> [ColumnType, List[Dict]]:
    """Query from the database given number of bins.

    Parameters
    ----------
    model_version: ModelVersion
    feature: str
    session: AsyncSession
    monitor_options: SingleWindowMonitorOptions
    num_bins: int

    Returns
    -------
    ColumnType, List[Dict]
    For numeric features return a list of bins with min-max as inclusive edges and non-overlapping between bins.
        [{'min': x, 'max': y, 'count': z, 'bucket': a}...]
    For categorical features return a list of top values with their count
        [{'value': x, 'count': y}...]
    """
    feature_type = ColumnType(model_version.features_columns[feature])
    feature_column = Column(feature)
    table = model_version.get_monitor_table(session)
    where_clause = and_(monitor_options.sql_time_filter(), monitor_options.sql_columns_filter())
    if feature_type in [ColumnType.NUMERIC, ColumnType.INTEGER]:
        # Adds for each feature his quantile
        feature_quantiles_cte = select([feature_column,
                                        func.cume_dist().over(order_by=feature_column).label('quantile')])\
            .select_from(table).where(where_clause).cte('feature_with_quantile')
        # Handle the case when quantile is 1, in this case the floor(quantile * bins number) doesn't work so setting it
        # into the last bin manually
        bucket = case([(Column('quantile') == 1, num_bins - 1)],
                      else_=func.floor(Column('quantile') * num_bins)).label('bucket')
        # Grouping the quantiles into buckets
        query = select([
            func.min(feature_column).label('min'),
            func.max(feature_column).label('max'),
            func.count().label('count'),
            bucket
        ]).select_from(feature_quantiles_cte).group_by(text('bucket')).order_by(text('min'))
        bins = (await session.execute(query)).all()
        return feature_type, bins
    elif feature_type == ColumnType.CATEGORICAL:
        query = select([
            feature_column.label('value'),
            func.count().label('count')
        ]).select_from(table).where(where_clause).group_by(feature_column).order_by(text('count')).limit(num_bins)
        bins = (await session.execute(query)).all()
        return feature_type, bins
    else:
        raise Exception(f'Don\'t know to create bins for feature of type {feature_type}')
