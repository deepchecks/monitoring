import dayjs from 'dayjs';

import { CheckResultSchema, AlertSchema } from 'api/generated';

import { setBarGraphOptions, setLineGraphOptions } from 'helpers/base/setGraphOptions';

interface ChartOptions {
  id: string;
  label?: string;
  borderColor?: string;
  pointBorderColor?: string | string[];
  pointBackgroundColor?: string | string[];
  pointHoverBackgroundColor?: string;
  pointHoverBorderColor?: string;
  hidden?: boolean;
  dashed?: boolean;
}

type LinesType = { [key: string]: (number | null)[] };
type GraphOutputType = { [key: string]: number | null };

const parseDataForChart = (
  graph: CheckResultSchema,
  setChartOptions: (
    label: string,
    index: number,
    dashed: boolean,
    alerts?: AlertSchema[],
    timeLabels?: number[]
  ) => ChartOptions,
  dashed = false,
  alerts?: AlertSchema[]
) => {
  if (!graph || !graph?.output) return { datasets: [], labels: [] };

  let counter = 0;

  const labels = graph.time_labels?.map(date => dayjs(date).valueOf());
  const output = graph.output;

  return {
    datasets: Object.keys(output)
      .map(key => {
        if (!output[key]) {
          return [];
        }

        const lines: LinesType = {};

        for (let i = 0; i < output[key].length; i++) {
          output[key].forEach((item: GraphOutputType) => {
            if (item) {
              Object.keys(item).forEach(itemKey => {
                lines[itemKey] = [];
              });
            }
          });
        }

        output[key].forEach((item: GraphOutputType) => {
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
          ...setChartOptions(`${lineKey}|${key}`, counter++, dashed, alerts, labels)
        }));
      })
      .flat(2),
    labels
  };
};

export const parseDataForLineChart = (graph: CheckResultSchema, dashed = false, alerts?: AlertSchema[]) =>
  parseDataForChart(graph, setLineGraphOptions, dashed, alerts);

export const parseDataForBarChart = (graph: CheckResultSchema, dashed = false) =>
  parseDataForChart(graph, setBarGraphOptions, dashed);
