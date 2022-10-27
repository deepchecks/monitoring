import React, { useEffect, useMemo, useState, createContext, useContext } from 'react';
import { ChartData } from 'chart.js';

import {
  getGetOrCreateDashboardApiV1DashboardsGetQueryKey,
  MonitorSchema,
  runMonitorLookbackApiV1MonitorsMonitorIdRunPost,
  useGetOrCreateDashboardApiV1DashboardsGet
} from '../api/generated';
import useModels from './useModels';

import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';

type MonitorId = MonitorSchema['id'];

export type MonitorsDataProvider = {
  children: JSX.Element;
};

export type MonitorsDataContext = {
  monitors: MonitorSchema[];
  chartDataList: ChartData<'line'>[];
  refreshMonitors: (monitor?: MonitorSchema) => void;
};

const MonitorsDataContext = createContext<MonitorsDataContext | null>(null);

const useMonitorsData = () => {
  const context = useContext(MonitorsDataContext);
  if (context === null) throw Error('MonitorsData is null');

  return context;
};

export const MonitorsDataProvider = ({ children }: MonitorsDataProvider): JSX.Element => {
  const [lastMonitorsFetch, setLastMonitorsFetch] = useState(new Date());

  const { data: dashboards, refetch } = useGetOrCreateDashboardApiV1DashboardsGet({
    query: {
      queryKey: [getGetOrCreateDashboardApiV1DashboardsGetQueryKey(), lastMonitorsFetch],
      refetchOnWindowFocus: false
    }
  });

  const [chartDataMap, setChartDataMap] = useState<Record<MonitorId, ChartData<'line'>>>({});
  const [currentMonitors, setCurrentMonitors] = useState<MonitorSchema[]>([]);

  const { modelsMap } = useModels();

  const monitors: MonitorSchema[] = dashboards?.monitors || [];

  const refreshMonitors = async (monitor?: MonitorSchema) => {
    if (!monitors.length) return;

    refetch();

    if (monitor) {
      console.log('Case 1');
      fetchMonitor(monitor, true);
    } else {
      console.log('Case 2');
      setLastMonitorsFetch(new Date());
    }
  };

  const fetchMonitor = async (monitor: MonitorSchema, isForceRefetch = false) => {
    if (!modelsMap || (!isForceRefetch && chartDataMap[monitor.id])) return;

    const fetchedMonitor = await runMonitorLookbackApiV1MonitorsMonitorIdRunPost(monitor.id, {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      end_time: new Date(modelsMap[monitor.check.model_id].latest_time * 1000)
    });

    const parsedDataForChart = parseDataForLineChart(fetchedMonitor);

    setChartDataMap(prevState => ({ ...prevState, [monitor.id]: parsedDataForChart }));
  };

  useEffect(() => {
    setCurrentMonitors(() => {
      const currentMonitors = [...monitors.sort((a, b) => a.check.model_id - b.check.model_id)];
      currentMonitors.forEach(monitor => fetchMonitor(monitor));

      return currentMonitors;
    });
  }, [dashboards, modelsMap]);

  const chartDataList = useMemo(
    () => currentMonitors.map(monitor => chartDataMap[monitor.id] || { labels: [], datasets: [] }),
    [currentMonitors, chartDataMap]
  );

  const value = { monitors: currentMonitors, chartDataList, refreshMonitors };

  return <MonitorsDataContext.Provider value={value}>{children}</MonitorsDataContext.Provider>;
};

export default useMonitorsData;
