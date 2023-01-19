import { useEffect, useMemo } from 'react';
import { AlertRuleInfoSchema, useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost } from '../api/generated';
import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';

const useAlertMonitorsData = (alertRule: AlertRuleInfoSchema | null, time: number | undefined) => {
  const { data, mutate, isLoading } = useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost();

  useEffect(() => {
    if (!alertRule || !time) return;
    mutate({ monitorId: alertRule.monitor_id, data: { end_time: new Date(time * 1000).toISOString() } });
  }, [alertRule, mutate, time]);

  const graphData = useMemo(() => {
    if (isLoading || !data || !Object.keys(data).length) {
      return {
        datasets: []
      };
    }

    return parseDataForLineChart(data, false, alertRule?.condition);
  }, [alertRule?.condition, data, isLoading]);

  return {
    graphData,
    isLoading
  };
};

export default useAlertMonitorsData;
