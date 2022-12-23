import React, { useMemo, useState, useCallback } from 'react';
import { ChartData } from 'chart.js';
import mixpanel from 'mixpanel-browser';

import { useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost } from 'api/generated';

import { Drawer, Box } from '@mui/material';

import CreateAlert from './components/CreateAlert';
import { GraphView } from './components/GraphView';
import { MonitorForm } from './components/MonitorForm';

import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';
import { StyledStackWrapper } from './MonitorDrawer.style';
import { MonitorDrawerProps, LookbackCheckProps, DrawerNamesMap } from './MonitorDrawer.types';

function MonitorDrawerComponent({ monitor, drawerName, onClose, setMonitorToRefreshId, ...props }: MonitorDrawerProps) {
  const [graphData, setGraphData] = useState<ChartData<'line'>>();
  const [resetMonitor, setResetMonitor] = useState<boolean>(false);

  const { mutateAsync: runCheck, isLoading: isRunCheckLoading } =
    useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost();

  const handleOnClose = useCallback(() => {
    setGraphData(undefined);
    onClose();

    mixpanel.track('Exited add/edit monitor window without saving');
  }, [onClose]);

  const handleLookback = useCallback(
    async (graphData: LookbackCheckProps) => {
      const { checkId, data } = graphData;

      try {
        const res = await runCheck({
          checkId,
          data
        });
        const parsedChartData = parseDataForLineChart(res);
        setGraphData(parsedChartData);
      } catch (e) {
        setGraphData(undefined);
      }
    },
    [runCheck]
  );

  const Content = useMemo(() => {
    switch (drawerName) {
      case DrawerNamesMap.CreateAlert:
        return (
          monitor && (
            <CreateAlert
              monitor={monitor}
              onClose={handleOnClose}
              runCheckLookback={handleLookback}
              setMonitorToRefreshId={setMonitorToRefreshId}
            />
          )
        );

      case DrawerNamesMap.CreateMonitor:
        return (
          <MonitorForm
            onClose={handleOnClose}
            runCheckLookback={handleLookback}
            resetMonitor={resetMonitor}
            setResetMonitor={setResetMonitor}
            setMonitorToRefreshId={setMonitorToRefreshId}
          />
        );

      case DrawerNamesMap.EditMonitor:
        return (
          monitor && (
            <MonitorForm
              onClose={handleOnClose}
              runCheckLookback={handleLookback}
              monitor={monitor}
              resetMonitor={resetMonitor}
              setResetMonitor={setResetMonitor}
              setMonitorToRefreshId={setMonitorToRefreshId}
            />
          )
        );

      default:
        return (
          <MonitorForm
            onClose={handleOnClose}
            runCheckLookback={handleLookback}
            resetMonitor={resetMonitor}
            setResetMonitor={setResetMonitor}
            setMonitorToRefreshId={setMonitorToRefreshId}
          />
        );
    }
  }, [drawerName, monitor, handleLookback, handleOnClose, resetMonitor, setMonitorToRefreshId]);

  return (
    <Drawer {...props}>
      <StyledStackWrapper direction="row">
        {Content}
        <Box sx={{ overflow: 'auto' }}>
          <GraphView
            onClose={handleOnClose}
            isLoading={isRunCheckLoading}
            graphData={graphData}
            setResetMonitor={setResetMonitor}
            timeFreq={monitor?.frequency}
          />
        </Box>
      </StyledStackWrapper>
    </Drawer>
  );
}

export const MonitorDrawer = React.memo(MonitorDrawerComponent);
