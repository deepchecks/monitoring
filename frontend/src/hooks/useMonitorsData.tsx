import React, { useEffect, useMemo, useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { ChartData } from 'chart.js';

import {
  MonitorSchema,
  runMonitorLookbackApiV1MonitorsMonitorIdRunPost,
  useGetOrCreateDashboardApiV1DashboardsGet
} from '../api/generated';
import useModels from './useModels';

import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';

type MonitorId = MonitorSchema['id'];

export type MonitorsDataProvider = {
  children: ReactNode;
};

export type MonitorsDataContextValues = {
  monitors: MonitorSchema[];
  chartDataList: ChartData<'line'>[];
  refreshMonitors: (monitor?: MonitorSchema) => void;
};

const MonitorsDataContext = createContext<MonitorsDataContextValues>({
  monitors: [],
  chartDataList: [],
  refreshMonitors: () => 1
});

const useMonitorsData = () => {
  const context = useContext(MonitorsDataContext);
  if (context === null) throw Error('MonitorsData is null');

  return context;
};

export const MonitorsDataProvider = ({ children }: MonitorsDataProvider) => {
  const { modelsMap } = useModels();
  const { data: dashboards, refetch } = useGetOrCreateDashboardApiV1DashboardsGet({
    query: {
      refetchOnWindowFocus: false
    }
  });

  const [chartDataMap, setChartDataMap] = useState<Record<MonitorId, ChartData<'line'>>>({});
  const [currentMonitors, setCurrentMonitors] = useState<MonitorSchema[]>([]);

  const monitors: MonitorSchema[] = useMemo(() => dashboards?.monitors || [], [dashboards]);

  const refreshMonitors = async (monitor?: MonitorSchema) => {
    if (!monitors.length) return;

    if (monitor) {
      fetchMonitor(monitor, true);
    }

    refetch();
  };

  const fetchMonitor = useCallback(
    async (monitor: MonitorSchema, isForceRefetch = false) => {
      if (!modelsMap || (!isForceRefetch && chartDataMap[monitor.id])) return;

      const fetchedMonitor = await runMonitorLookbackApiV1MonitorsMonitorIdRunPost(monitor.id, {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        end_time: new Date(modelsMap[monitor.check.model_id].latest_time * 1000)
      });

      const parsedDataForChart = parseDataForLineChart(fetchedMonitor);

      setChartDataMap(prevState => ({ ...prevState, [monitor.id]: parsedDataForChart }));
    },
    [modelsMap, chartDataMap]
  );

  useEffect(() => {
    const currentMonitors = [...monitors.sort((a, b) => modelsMap[a.check.model_id].name.localeCompare(modelsMap[b.check.model_id].name))];
    currentMonitors.forEach(monitor => fetchMonitor(monitor));

    setCurrentMonitors(currentMonitors);
  }, [dashboards, fetchMonitor, monitors]);

  const chartDataList = useMemo(
    () => currentMonitors.map(monitor => chartDataMap[monitor.id] || { labels: [], datasets: [] }),
    [currentMonitors, chartDataMap]
  );

  const value = { monitors: currentMonitors, chartDataList, refreshMonitors };

  return <MonitorsDataContext.Provider value={value}>{children}</MonitorsDataContext.Provider>;
};

export default useMonitorsData;
