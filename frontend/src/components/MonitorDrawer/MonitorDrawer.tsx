import { Drawer, DrawerProps, Stack, styled } from '@mui/material';
import {
  MonitorCheckConfSchema,
  MonitorSchema,
  OperatorsEnum,
  useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost
} from 'api/generated';
import { ChartData } from 'chart.js';
import React, { useMemo, useState } from 'react';
import { parseDataForChart } from '../../helpers/utils/parseDataForChart';
import CreateAlert from './AlertForm/CreateAlert';
import { GraphView } from './GraphView';
import { CreateMonitor } from './MonitorForm/CreateMonitor';
import EditMonitor from './MonitorForm/EditMonitor';

export const StyledStackWrapper = styled(Stack)({
  height: '100%'
});

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

  const handleOnClose = () => {
    setGraphData(undefined);
    onClose();
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
        return monitor ? (
          <CreateAlert monitor={monitor} onClose={handleOnClose} runCheckLookback={handleLookback} />
        ) : null;
      case DrawerNamesMap.CreateMonitor:
        return (
          <CreateMonitor
            onClose={handleOnClose}
            runCheckLookback={handleLookback}
            resetMonitor={resetMonitor}
            setResetMonitor={setResetMonitor}
          />
        );
      case DrawerNamesMap.EditMonitor:
        return monitor ? (
          <EditMonitor
            onClose={handleOnClose}
            runCheckLookback={handleLookback}
            monitor={monitor}
            resetMonitor={resetMonitor}
            setResetMonitor={setResetMonitor}
          />
        ) : null;
      default:
        return (
          <CreateMonitor
            onClose={handleOnClose}
            runCheckLookback={handleLookback}
            resetMonitor={resetMonitor}
            setResetMonitor={setResetMonitor}
          />
        );
    }
  }, [drawerName]);

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
