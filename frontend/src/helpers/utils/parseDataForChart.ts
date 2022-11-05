import dayjs from 'dayjs';

import { CheckResultSchema } from 'api/generated';

import { setBarGraphOptions, setLineGraphOptions } from 'helpers/setGraphOptions';

interface ChartOptions {
  label?: string;
  borderColor?: string;
  pointBorderColor?: string;
  pointBackgroundColor?: string;
  pointHoverBackgroundColor?: string;
  pointHoverBorderColor?: string;
  hidden?: boolean;
  dashed?: boolean;
}

type LinesType = { [key: string]: (number | null)[] };
type GraphOutputType = { [key: string]: number | null };

const parseDataForChart = (
  graph: CheckResultSchema,
  setChartOptions: (label: string, index: number, dashed: boolean) => ChartOptions,
  dashed = false
) => {
  if (!graph) return { datasets: [], labels: [] };

  let counter = 0;

  return {
    datasets: Object.keys(graph.output)
      .map(key => {
        if (!graph.output[key]) {
          return [];
        }

        const lines: LinesType = {};

        for (let i = 0; i < graph.output[key].length; i++) {
          graph.output[key].forEach((item: GraphOutputType) => {
            if (item) {
              Object.keys(item).forEach(itemKey => {
                lines[itemKey] = [];
              });
            }
          });
        }

        graph.output[key].forEach((item: GraphOutputType) => {
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
          ...setChartOptions(`${lineKey}|${key}`, counter++, dashed)
        }));
      })
      .flat(2),
    labels: graph.time_labels?.map(date => dayjs(date).valueOf())
  };
};

export const parseDataForLineChart = (graph: CheckResultSchema, dashed = false) =>
  parseDataForChart(graph, setLineGraphOptions, dashed);

export const parseDataForBarChart = (graph: CheckResultSchema, dashed = false) =>
  parseDataForChart(graph, setBarGraphOptions, dashed);
