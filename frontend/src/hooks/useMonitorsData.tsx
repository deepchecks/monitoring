import React, { useEffect, useState, useMemo, createContext, useContext } from 'react';
import {
  getGetDashboardApiV1DashboardsGetQueryKey,
  MonitorSchema,
  runMonitorLookbackApiV1MonitorsMonitorIdRunPost,
  useGetDashboardApiV1DashboardsGet
} from '../api/generated';
import { ChartData } from 'chart.js';
import useModels from './useModels';
import { parseDataForChart } from 'helpers/utils/parseDataForChart';

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
  if (context === null) throw Error('UserContext is null');

  return context;
};

export const MonitorsDataProvider = ({ children }: MonitorsDataProvider): JSX.Element => {
  const [lastMonitorsFetch, setLastMonitorsFetch] = useState(new Date());

  const { data: dashboards } = useGetDashboardApiV1DashboardsGet({
    query: {
      queryKey: [getGetDashboardApiV1DashboardsGetQueryKey(), lastMonitorsFetch]
    }
  });

  const [chartDataMap, setChartDataMap] = useState<Record<MonitorId, ChartData<'line'>>>({});

  useEffect(() => console.log('UPDATE', { lastMonitorsFetch }), [lastMonitorsFetch]);

  const { modelsMap } = useModels();
  const { monitors = [] } = dashboards || {};

  const refreshMonitors = async (monitor?: MonitorSchema) => {
    if (!monitors.length) return;

    if (monitor) {
      console.log('Case 1');
      fetchMonitor(monitor, true);
    } else {
      console.log('Case 2');
      setLastMonitorsFetch(new Date());
      //   // -> refresh monitors list, make sure existing monitors data is not being refreshed;
      //   await fetchMonitors();
      //   console.log('dashboards', dashboards);
    }
  };

  const fetchMonitor = async (monitor: MonitorSchema, isForceRefetch = false) => {
    if (!isForceRefetch && chartDataMap[monitor.id]) return;

    const fetchedMonitor = await runMonitorLookbackApiV1MonitorsMonitorIdRunPost(monitor.id, {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      end_time: new Date(modelsMap[monitor?.check.model_id]?.latest_time * 1000)
    });

    const parsedDataForChart = parseDataForChart(fetchedMonitor);

    setChartDataMap(prevState => ({ ...prevState, [monitor.id]: parsedDataForChart }));
  };

  useEffect(() => {
    monitors.map(monitor => fetchMonitor(monitor));
  }, [dashboards, modelsMap]);

  const chartDataList = useMemo(
    () => monitors.map(monitor => chartDataMap[monitor.id] || { labels: [], datasets: [] }),
    [monitors, chartDataMap]
  );

  const value = { monitors, chartDataList, refreshMonitors };

  return <MonitorsDataContext.Provider value={value}>{children}</MonitorsDataContext.Provider>;
};

export default useMonitorsData;
