import React, { useMemo, useState } from 'react';
import { ChartData } from 'chart.js';
import mixpanel from 'mixpanel-browser';

import { useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost } from 'api/generated';

import { parseDataForChart } from '../../helpers/utils/parseDataForChart';

import { Drawer } from '@mui/material';

import CreateAlert from './AlertForm/CreateAlert';
import { GraphView } from './GraphView';
import MonitorForm from './MonitorForm/MonitorForm';
// import { CreateMonitor } from './MonitorForm/CreateMonitor';
// import EditMonitor from './MonitorForm/EditMonitor';

import { StyledStackWrapper } from './MonitorDrawer.style';

import { MonitorDrawerProps, LookbackCheckProps, DrawerNamesMap } from './MonitorDrawer.types';

function MonitorDrawer({ monitor, drawerName, onClose, ...props }: MonitorDrawerProps) {
  const [graphData, setGraphData] = useState<ChartData<'line'>>();
  const [resetMonitor, setResetMonitor] = useState<boolean>(false);

  const { mutateAsync: runCheck, isLoading: isRunCheckLoading } =
    useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost();

  const handleOnClose = () => {
    setGraphData(undefined);
    onClose();

    mixpanel.track('Exited add/edit monitor window without saving');
  };

  const handleLookback = async (graphData: LookbackCheckProps) => {
    const { checkId, data } = graphData;

    try {
      const res = await runCheck({
        checkId,
        data
      });
      const parsedChartData = parseDataForChart(res);

      setGraphData(parsedChartData);
    } catch (e) {
      setGraphData(undefined);
    }
  };

  const Content = useMemo(() => {
    switch (drawerName) {
      case DrawerNamesMap.CreateAlert:
        return monitor && <CreateAlert monitor={monitor} onClose={handleOnClose} runCheckLookback={handleLookback} />;

      case DrawerNamesMap.CreateMonitor:
        return (
          <MonitorForm
            onClose={handleOnClose}
            runCheckLookback={handleLookback}
            resetMonitor={resetMonitor}
            setResetMonitor={setResetMonitor}
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
          />
        );
    }
  }, [drawerName, monitor]);

  return (
    <Drawer {...props}>
      <StyledStackWrapper direction="row">
        {Content}
        <GraphView
          onClose={handleOnClose}
          isLoading={isRunCheckLoading}
          graphData={graphData}
          setResetMonitor={setResetMonitor}
        />
      </StyledStackWrapper>
    </Drawer>
  );
}

export default React.memo(MonitorDrawer);
