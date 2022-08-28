import { ChartData } from "chart.js";
import dayjs from "dayjs";
import { ChartResponse, GraphData } from "../types";
import { setGraphOptions } from "./setGraphOptions";

export const parseDataForChart = (
  graph: ChartResponse
): ChartData<"line", GraphData> => ({
  datasets: Object.keys(graph.output)
    .map((key) => {
      let counter = 0;
      if (!graph.output[key]) {
        return [];
      }

      const lines: { [key: string]: (number | null)[] } = {};

      if (
        graph.output[key][0] &&
        Object.keys(graph.output[key][0]).length === 1
      ) {
        return {
          data: graph.output[key].map((item) => {
            if (!item) {
              return null;
            }

            const [key] = Object.keys(item);
            return item[key];
          }),
          ...setGraphOptions(key, counter++),
        };
      }

      graph.output[key].forEach((item) => {
        if (item) {
          Object.keys(item).forEach((itemKey) => {
            if (lines[itemKey]) {
              lines[itemKey].push(item[itemKey]);
            } else {
              lines[itemKey] = [item[itemKey]];
            }
          });
        }
      });

      return Object.keys(lines).map((lineKey) => ({
        data: lines[lineKey],
        ...setGraphOptions(lineKey, counter++),
      }));
    })
    .flat(2),
  labels: graph.time_labels?.map((date) =>
    dayjs(new Date(date)).format("MMM. DD")
  ),
});
