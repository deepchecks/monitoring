import { useEffect, useMemo } from 'react';
import {
  AlertRuleInfoSchema,
  useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost,
  AlertSchema
} from '../../api/generated';
import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';

const useAlertMonitorsData = (
  alertRule: AlertRuleInfoSchema | null,
  time: number | undefined,
  alerts: AlertSchema[]
) => {
  const { data, mutate, isLoading } = useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost();

  useEffect(() => {
    if (!alertRule || !time) return;
    mutate({ monitorId: alertRule.monitor_id, data: { end_time: new Date(time * 1000).toISOString() } });
  }, [alertRule, mutate, time]);

  const graphData = useMemo(() => {
    if (isLoading || !data || !Object.keys(data).length) {
      return {
        datasets: [],
        labels: []
      };
    }

    return parseDataForLineChart(data, false, alerts);
  }, [alerts, data, isLoading]);

  return {
    graphData,
    isLoading
  };
};

export default useAlertMonitorsData;
