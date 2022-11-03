import { Drawer, DrawerProps } from '@mui/material';
import {
  MonitorCheckConfSchema,
  MonitorSchema,
  OperatorsEnum,
  useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost
} from 'api/generated';
import { ChartData } from 'chart.js';
import React, { useMemo, useState, useCallback } from 'react';
import { parseDataForLineChart } from '../../helpers/utils/parseDataForChart';
import CreateAlert from './AlertForm/CreateAlert';
import { GraphView } from './GraphView';
import MonitorForm from './MonitorForm/MonitorForm';
// import { CreateMonitor } from './MonitorForm/CreateMonitor';
// import EditMonitor from './MonitorForm/EditMonitor';

import mixpanel from 'mixpanel-browser';
import { StyledStackWrapper } from './MonitorDrawer.style';

export interface LookbackCheckProps {
  checkId: number;
  data: {
    start_time: string;
    end_time: string;
    filter?: {
      filters: {
        column: string;
        operator: OperatorsEnum;
        value: string | number;
      }[];
    };
    additional_kwargs: MonitorCheckConfSchema;
    frequency: number;
    aggregation_window: number;
  };
}

export enum DrawerNamesMap {
  CreateMonitor = 'new monitor',
  CreateAlert = 'new alert',
  EditMonitor = 'edit monitor'
}

export type DrawerNames = DrawerNamesMap.CreateMonitor | DrawerNamesMap.CreateAlert | DrawerNamesMap.EditMonitor;

interface MonitorDrawerProps extends DrawerProps {
  monitor?: MonitorSchema;
  drawerName: DrawerNames;
  onClose: () => void;
}

function MonitorDrawer({ monitor, drawerName, onClose, ...props }: MonitorDrawerProps) {
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
  }, [drawerName, monitor, handleLookback, handleOnClose, resetMonitor]);

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
