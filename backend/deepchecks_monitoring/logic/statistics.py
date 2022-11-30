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
import math
from typing import Dict, List

from sqlalchemy import Column, and_, case, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.logic.check_logic import SingleWindowMonitorOptions
from deepchecks_monitoring.schema_models import ModelVersion
from deepchecks_monitoring.schema_models.column_type import ColumnType

__all__ = ['bins_for_feature']


__all__ = ['bins_for_feature']


async def bins_for_feature(model_version: ModelVersion, feature: str, session: AsyncSession,
                           monitor_options: SingleWindowMonitorOptions, num_bins=30) -> [ColumnType, List[Dict]]:
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
        bins = [dict(it) for it in (await session.execute(query)).all()]
        _add_scaled_bins_names(bins)
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


def _get_range_scale(start, stop):
    # If got start and stop return the scale of its range. if got single number return the scale of itself.
    if start is not None and stop is not None:
        curr_range = stop - start
    else:
        curr_range = abs(start if start is not None else stop)

    if curr_range == 0:
        return 0
    else:
        # Get the scale of number.
        return math.floor(math.log10(curr_range))


def _add_scaled_bins_names(bins):
    # Edges is length of bins + 1
    edges = [b['min'] for b in bins] + [bins[len(bins) - 1]['max']]
    scaled_edges = []
    # Scaling every edge by the scale of it's range with its neighbouring edges.
    for i, edge in enumerate(edges):
        if -0.01 < edge < 0.01:
            scaled_edges.append(format(edge, '.2e'))
        else:
            prev_edge = edges[i - 1] if i - 1 >= 0 else None
            next_edge = edges[i + 1] if i + 1 < len(edges) else None
            scale = min(_get_range_scale(prev_edge, edge), _get_range_scale(edge, next_edge))
            scale_to_round = -scale if scale < -2 else 2
            scaled_edges.append(round(edge, scale_to_round))

    all_single_value = all(it['max'] == it['min'] for it in bins)
    for i, curr_bin in enumerate(bins):
        if all_single_value:
            curr_bin['name'] = scaled_edges[i]
        else:
            closer = ']' if i + 2 == len(scaled_edges) else ')'
            curr_bin['name'] = f'[{scaled_edges[i]}, {scaled_edges[i + 1]}' + closer
