import { useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost } from 'api/generated';

import { parseDataForBarChart, parseDataForLineChart } from 'helpers/utils/parseDataForChart';

export const useRunCheckLookback = (type: 'line' | 'bar' = 'line') => {
  const checkRun = useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost();

  const chartData = () => {
    if (checkRun && checkRun.data) {
      if (type === 'line') {
        return parseDataForLineChart(checkRun.data);
      }

      if (type === 'bar') {
        return parseDataForBarChart(checkRun.data);
      }
    }

    return { datasets: [], labels: [] };
  };

  return { chartData, ...checkRun };
};
