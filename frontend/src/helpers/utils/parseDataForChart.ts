import { CheckResultSchema } from 'api/generated';
import { ChartData } from 'chart.js';
import { setGraphOptions } from 'helpers/setGraphOptions';
import dayjs from 'dayjs';

export const parseDataForChart = (graph: CheckResultSchema): ChartData<'line'> => {
  if (!graph) return { datasets: [], labels: [] };
  return {
    datasets: Object.keys(graph.output)
      .map(key => {
        let counter = 0;
        if (!graph.output[key]) {
          return [];
        }

        const lines: { [key: string]: (number | null)[] } = {};
        for (let i = 0; i < graph.output[key].length; i++) {
          graph.output[key].forEach((item: any) => {
            if (item) {
              Object.keys(item).forEach(itemKey => {
                lines[itemKey] = [];
              });
            }
          });
        }

        graph.output[key].forEach((item: any) => {
          if (item) {
            Object.keys(item).forEach(itemKey => {
              lines[itemKey].push(item[itemKey]);
            });
            return;
          }

          Object.keys(lines).forEach(itemKey => {
            lines[itemKey].push(null);
          });
        });
        return Object.keys(lines).map(lineKey => ({
          data: lines[lineKey],
          ...setGraphOptions(lineKey, counter++)
        }));
      })
      .flat(2),
    labels: graph.time_labels?.map(date => dayjs(new Date(date)).format('MMM. DD'))
  };
};
