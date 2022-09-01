import React, { useEffect, useMemo } from 'react';
import {
  AlertRuleInfoSchema,
  CheckResultSchema,
  useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost
} from '../api/generated';
import { ChartData } from 'chart.js';
import dayjs from 'dayjs';
import { setGraphOptions } from '../helpers/setGraphOptions';

export const parseMonitorDataForChart = (graph: CheckResultSchema): ChartData<'line'> => ({
  datasets: Object.keys(graph.output)
    .map(key => {
      let counter = 0;
      if (!graph.output[key]) {
        return [];
      }

      const lines: { [key: string]: (number | null)[] } = {};

      if (graph.output[key][0] && Object.keys(graph.output[key][0]).length === 1) {
        return {
          data: graph.output[key].map((item: any) => {
            if (!item) {
              return null;
            }

            const [key] = Object.keys(item);
            return item[key];
          }),
          ...setGraphOptions(key, counter++)
        };
      }

      graph.output[key].forEach((item: any) => {
        if (item) {
          Object.keys(item).forEach(itemKey => {
            if (lines[itemKey]) {
              lines[itemKey].push(item[itemKey]);
            } else {
              lines[itemKey] = [item[itemKey]];
            }
          });
        }
      });

      return Object.keys(lines).map(lineKey => ({
        data: lines[lineKey],
        ...setGraphOptions(lineKey, counter++)
      }));
    })
    .flat(2),
  labels: graph.time_labels?.map(date => dayjs(new Date(date)).format('MMM. DD'))
});

const useMonitorsData = (alertRule: AlertRuleInfoSchema | null) => {
  const { data, mutate, isLoading } = useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost();

  useEffect(() => {
    if (!alertRule) return;
    mutate({ monitorId: alertRule.monitor_id, data: {} });
  }, [alertRule]);

  const graphData = useMemo(() => {
    if (isLoading || !data || !Object.keys(data).length) {
      return {
        datasets: []
      };
    }

    return parseMonitorDataForChart(data);
  }, [data, isLoading]);

  return {
    graphData,
    isLoading
  };
};

export default useMonitorsData;
