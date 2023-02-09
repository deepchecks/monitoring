import React, { useState, useCallback } from 'react';
import { ChartData } from 'chart.js';
import mixpanel from 'mixpanel-browser';

import {
  MonitorSchema,
  useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost,
  MonitorOptions
} from 'api/generated';

import { DrawerProps, Stack } from '@mui/material';

import { CustomDrawer, CustomDrawerHeader } from 'components/CustomDrawer';
import { MonitorDrawerGraph as GraphView } from './components/MonitorDrawerGraph';
import { MonitorForm } from './components/MonitorForm';
import { CreateAlertForm } from './components/CreateAlertForm';

import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';

import { DrawerNames } from '../Dashboard.types';
import { GraphData } from 'helpers/types';
import { SelectValues } from 'helpers/types';

interface MonitorDrawerProps extends DrawerProps {
  monitor: MonitorSchema | null;
  drawerName: DrawerNames;
  setMonitorToRefreshId: React.Dispatch<React.SetStateAction<number | null>>;
  onClose: () => void;
  refetchMonitors(): void;
}

export const MonitorDrawer = ({
  monitor,
  drawerName,
  setMonitorToRefreshId,
  open,
  onClose,
  refetchMonitors,
  ...props
}: MonitorDrawerProps) => {
  const { mutateAsync: runCheck, isLoading: isRunCheckLoading } =
    useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost();

  const [graphData, setGraphData] = useState<ChartData<'line', GraphData> | null>(null);

  const handleGraphLookBack = useCallback(
    async (checkId: SelectValues, data: MonitorOptions) => {
      if (typeof checkId !== 'number') return setGraphData(null);

      try {
        const response = await runCheck({
          checkId,
          data
        });
        const parsedChartData = parseDataForLineChart(response);
        setGraphData(parsedChartData);
      } catch (e) {
        setGraphData(null);
      }
    },
    [runCheck]
  );

  const closeDrawer = () => {
    onClose();
    setTimeout(() => setGraphData(null), 500);
  };

  const handleOnCloseDrawer = () => {
    mixpanel.track('Exited add/edit monitor window without saving');
    closeDrawer();
  };

  const [graphFrequency, setGraphFrequency] = useState<SelectValues>(monitor?.frequency || '');

  return (
    <CustomDrawer open={open} onClose={handleOnCloseDrawer} padding="40px 40px 0 40px" {...props}>
      <CustomDrawerHeader title={drawerName} onClick={handleOnCloseDrawer} marginBottom="32px" />
      <Stack direction="row" justifyContent="space-between" height="calc(100vh - 120px)">
        {drawerName === DrawerNames.CreateAlert && monitor ? (
          <CreateAlertForm
            monitor={monitor}
            onClose={closeDrawer}
            runCheckLookBack={handleGraphLookBack}
            setMonitorToRefreshId={setMonitorToRefreshId}
          />
        ) : (
          <MonitorForm
            monitor={monitor}
            refetchMonitors={refetchMonitors}
            setMonitorToRefreshId={setMonitorToRefreshId}
            handleCloseDrawer={closeDrawer}
            runCheckLookBack={handleGraphLookBack}
            isDrawerOpen={!!open}
            setGraphFrequency={setGraphFrequency}
          />
        )}
        <GraphView
          graphData={graphData}
          isLoading={isRunCheckLoading}
          timeFreq={(graphFrequency && +graphFrequency) || monitor?.frequency}
        />
      </Stack>
    </CustomDrawer>
  );
};
