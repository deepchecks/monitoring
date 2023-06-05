import { ColumnMetadata } from 'api/generated';

import { CategoricalFilters, ColumnsFilters } from 'helpers/context/AnalysisProvider';
import { STANDALONE_FILTERS } from 'helpers/context/AnalysisProvider';
import { getParams } from 'helpers/utils/getParams';
import { ColumnType } from 'helpers/types/model';

type Columns = { [k: string]: ColumnMetadata };

export function calculateCurrentFilters(columns: Columns) {
  const currentFilters: ColumnsFilters = {};

  Object.entries(columns).forEach(([key, value]) => {
    if (value.type === ColumnType.categorical) {
      if (value.stats.values) {
        const categories: Record<string, boolean> = {};

        value.stats.values.forEach(filter => {
          categories[filter] = false;
        });

        currentFilters[key] = categories;
        return;
      }

      currentFilters[key] = {};
    }

    if (value.type === ColumnType.numeric) {
      currentFilters[key] = null;
    }
  });

  return currentFilters;
}

export function calculateInitialActiveFilters(filters: ColumnsFilters) {
  const result = { ...filters };

  Object.entries(getParams()).forEach(([key, value]) => {
    if (STANDALONE_FILTERS.includes(key) || !Object.keys(filters).includes(key)) return;

    if (filters[key]) {
      const categoricalValuesArray = value.split(',');
      const categoricalValues: CategoricalFilters = {};

      categoricalValuesArray.forEach(v => {
        if (Object.keys(filters[key] || {}).includes(v)) categoricalValues[v] = true;
      });

      result[key] = { ...filters[key], ...categoricalValues };
    } else {
      const [gte, lte] = value.split(',');
      if (!isNaN(+gte) && !isNaN(+lte)) result[key] = [+gte, +lte];
    }
  });

  return result;
}
