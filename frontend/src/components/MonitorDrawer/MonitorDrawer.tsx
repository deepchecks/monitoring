import { Drawer, DrawerProps, Stack, styled } from '@mui/material';
import {
  MonitorCheckConfSchema,
  MonitorSchema,
  OperatorsEnum,
  useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost
} from 'api/generated';
import { ChartData } from 'chart.js';
import React, { useState } from 'react';
import { parseDataForChart } from '../../helpers/utils/parseDataForChart';
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
  };
}

interface MonitorDrawerProps extends DrawerProps {
  monitor?: MonitorSchema;
  onClose: () => void;
}

function MonitorDrawer({ monitor, onClose, ...props }: MonitorDrawerProps) {
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

  return (
    <Drawer {...props}>
      <StyledStackWrapper direction="row">
        {monitor ? (
          <EditMonitor
            onClose={handleOnClose}
            runCheckLookback={handleLookback}
            monitor={monitor}
            resetMonitor={resetMonitor}
            setResetMonitor={setResetMonitor}
          />
        ) : (
          <CreateMonitor
            onClose={handleOnClose}
            runCheckLookback={handleLookback}
            resetMonitor={resetMonitor}
            setResetMonitor={setResetMonitor}
          />
        )}
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
