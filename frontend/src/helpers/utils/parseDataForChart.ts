import { CheckResultSchema } from 'api/generated';
import { ChartData } from 'chart.js';
import dayjs from 'dayjs';
import { setGraphOptions } from 'helpers/setGraphOptions';

export const parseDataForChart = (graph: CheckResultSchema): ChartData<'line'> => {
  if (!graph) return { datasets: [], labels: [] };
  let counter = 0;
  return {
    datasets: Object.keys(graph.output)
      .map(key => {
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
          ...setGraphOptions(`${lineKey}|${key}`, counter++)
        }));
      })
      .flat(2),
    labels: graph.time_labels?.map(date => dayjs(new Date(date)).format('MMM. DD YYYY'))
  };
};
