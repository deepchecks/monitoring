import { useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost } from 'api/generated';
import { parseDataForBarChart, parseDataForLineChart } from 'helpers/utils/parseDataForChart';
import { useMemo } from 'react';

export const useRunCheckLookback = (type: 'line' | 'bar' = 'line') => {
  const checkRun = useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost();

  const chartData = useMemo(() => {
    if (checkRun.data) {
      if (type === 'line') {
        return parseDataForLineChart(checkRun.data);
      }

      if (type === 'bar') {
        return parseDataForBarChart(checkRun.data);
      }
    }

    return { datasets: [], labels: [] };
  }, [checkRun.data]);

  return { chartData, ...checkRun };
};
