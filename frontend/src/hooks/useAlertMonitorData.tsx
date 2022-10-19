import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';
import { useEffect, useMemo } from 'react';
import {
  AlertRuleInfoSchema,
  useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost
} from '../api/generated';



const useMonitorsData = (alertRule: AlertRuleInfoSchema | null, time: number | undefined) => {
  const { data, mutate, isLoading } = useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost();

  useEffect(() => {
    if (!alertRule || !time) return;
    mutate({ monitorId: alertRule.monitor_id, data: { end_time: new Date(time * 1000).toISOString() } });
  }, [alertRule]);

  const graphData = useMemo(() => {
    if (isLoading || !data || !Object.keys(data).length) {
      return {
        datasets: []
      };
    }

    return parseDataForLineChart(data);
  }, [data, isLoading]);

  return {
    graphData,
    isLoading
  };
};

export default useMonitorsData;
