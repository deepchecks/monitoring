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
import typing as t

from sqlalchemy import Column, case, desc, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.logic.check_logic import SingleCheckRunOptions
from deepchecks_monitoring.schema_models import ModelVersion
from deepchecks_monitoring.schema_models.column_type import ColumnType

__all__ = ['bins_for_feature']


async def bins_for_feature(
    model_version: ModelVersion,
    table,
    feature: str,
    session: AsyncSession,
    monitor_options: SingleCheckRunOptions,
    numeric_bins=10,
    categorical_bins=30,
    filter_labels_exist: bool = False
) -> t.Tuple[ColumnType, t.List[t.Dict]]:
    """Query from the database given number of bins.

    Parameters
    ----------
    model_version: ModelVersion
    table
    feature: str
    session: AsyncSession
    monitor_options: SingleCheckRunOptions
    numeric_bins: int
    categorical_bins: int
    filter_labels_exist: bool, default False
        Whether to filter out samples that don't have labels

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
    num_bins = numeric_bins if feature_type in [ColumnType.NUMERIC, ColumnType.INTEGER] else categorical_bins
    if feature_type in [ColumnType.NUMERIC, ColumnType.INTEGER]:
        # Adds for each feature his quantile
        feature_quantiles_cte = (select([feature_column,
                                        func.cume_dist().over(order_by=feature_column).label('quantile')])
                                 .select_from(table)
                                 .where(monitor_options.sql_all_filters()))
        if filter_labels_exist:
            feature_quantiles_cte = model_version.model.filter_labels_exist(feature_quantiles_cte, table)
        feature_quantiles_cte = feature_quantiles_cte.cte('feature_with_quantile')

        # Handle the case when quantile is 1, in this case the floor(quantile * bins number) doesn't work so setting it
        # into the last bin manually (bins number - 1).
        # For nulls the window function returns 1, so they will get the last bin + 1.
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
        query = (select([
            feature_column.label('value'),
            func.count().label('count')
        ]).select_from(table)
            .where(monitor_options.sql_all_filters())
            .group_by(feature_column)
            .order_by(desc(text('count'))).limit(num_bins))
        if filter_labels_exist:
            query = model_version.model.filter_labels_exist(query, table, filter_not_null=True)
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
    # If there is a bucket of null values filter it out
    null_bucket = next((b for b in bins if b['min'] is None), None)
    if null_bucket:
        null_bucket['name'] = 'Null'
        bins = bins.copy()
        bins.remove(null_bucket)

    edges = [b['min'] for b in bins] + [bins[len(bins) - 1]['max']]
    scaled_edges = []
    # Run formatting for each edge
    for i, edge in enumerate(edges):
        if edge == 0:
            scaled_edges.append('0')
        elif -0.01 < edge < 0.01:
            scaled_edges.append(format(edge, '.2e'))
        else:
            # Scaling every edge by the scale of it's range with its neighbouring edges.
            prev_edge = edges[i - 1] if i - 1 >= 0 else None
            next_edge = edges[i + 1] if i + 1 < len(edges) else None
            scale = min(_get_range_scale(prev_edge, edge), _get_range_scale(edge, next_edge))
            scale_to_round = -scale if scale < -2 else 2
            round_edge = round(edge, scale_to_round)
            # If after round the number is whole, display it as whole number.
            if int(round_edge) == round_edge:
                round_edge = int(round_edge)
            scaled_edges.append(round_edge)

    all_single_value = all(it['max'] == it['min'] for it in bins)
    for i, curr_bin in enumerate(bins):
        if all_single_value:
            curr_bin['name'] = scaled_edges[i]
        else:
            closer = ']' if i + 2 == len(scaled_edges) else ')'
            curr_bin['name'] = f'[{scaled_edges[i]}, {scaled_edges[i + 1]}' + closer
