import React, { useEffect, useState, useMemo } from 'react';
import {
  CheckResultSchema,
  runMonitorLookbackApiV1MonitorsMonitorIdRunPost,
  useGetDashboardApiV1DashboardsGet
} from '../api/generated';
import { ChartData } from 'chart.js';
import dayjs from 'dayjs';
import { setGraphOptions } from 'helpers/setGraphOptions';
import useModelsMap from './useModelsMap';

export const parseMonitorDataForChart = (graph: CheckResultSchema): ChartData<'line'> => ({
  datasets: Object.keys(graph.output)
    .map(key => {
      let counter = 0;
      if (!graph.output[key]) {
        return [];
      }

      const lines: { [key: string]: (number | null)[] } = {};

      for (let i = 0; !Object.keys(lines).length || i < graph.output[key].length; i++) {
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
});

const useMonitorsData = () => {
  const { data: dashboards } = useGetDashboardApiV1DashboardsGet();
  const [chartDataList, setChartDataList] = useState<ChartData<'line'>[]>([]);

  const modelsMap = useModelsMap();
  const monitors = useMemo(() => dashboards?.monitors ?? [], [dashboards]);

  useEffect(() => {
    if (!monitors) return;

    const monitorFetchers = monitors.map(monitor => {
      console.log({ monitor, modelsMap });
      return runMonitorLookbackApiV1MonitorsMonitorIdRunPost(monitor.id, {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        end_time: new Date(modelsMap[monitor.check.model_id]?.latest_time * 1000)
      });
    });
    Promise.allSettled(monitorFetchers)
      .then(monitors => monitors.map(result => {
        if (result.status == 'fulfilled') {
          return parseMonitorDataForChart(result.value)
        }
        else {
          console.log("Error fetching monitor" + result)
          return {labels: [], datasets: []};
        }
      } ))
      .then(setChartDataList);
  }, [dashboards]);

  return { monitors, chartDataList };
};

export default useMonitorsData;
