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

      for (
        let i = 0;
        !Object.keys(lines).length || i < graph.output[key].length;
        i++
      ) {
        graph.output[key].forEach((item) => {
          if (item) {
            Object.keys(item).forEach((itemKey) => {
              lines[itemKey] = [];
            });
          }
        });
      }

      graph.output[key].forEach((item) => {
        if (item) {
          Object.keys(item).forEach((itemKey) => {
            lines[itemKey].push(item[itemKey]);
          });
          return;
        }

        Object.keys(lines).forEach((itemKey) => {
          lines[itemKey].push(null);
        });
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
