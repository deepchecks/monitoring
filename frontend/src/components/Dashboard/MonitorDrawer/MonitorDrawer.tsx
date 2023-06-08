import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ChartData } from 'chart.js';

import {
  useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost,
  MonitorOptions,
  MonitorSchema,
  Frequency
} from 'api/generated';

import { Stack, Box } from '@mui/material';

import { MonitorDrawerGraph as GraphView } from './components/MonitorDrawerGraph';
import { MonitorForm } from './components/MonitorForm';
import { CreateAlertForm } from './components/CreateAlertForm';

import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';

import { DrawerNames } from '../Dashboard.types';
import { GraphData } from 'helpers/types';
import { SelectValues } from 'helpers/types';
import { FrequencyMap, frequencyValues } from 'helpers/utils/frequency';
import { StyledDialog } from 'components/lib';

interface MonitorDialogContentRef extends HTMLElement {
  submit(): void;
}

interface MonitorDrawerProps {
  open: boolean;
  monitor: MonitorSchema | null;
  drawerName: DrawerNames;
  setMonitorToRefreshId: React.Dispatch<React.SetStateAction<number | null>>;
  onClose: () => void;
  refetchMonitors(): void;
  selectedModelId: number | null;
}

export const MonitorDrawer = ({
  monitor,
  drawerName,
  setMonitorToRefreshId,
  open,
  onClose,
  refetchMonitors,
  selectedModelId
}: MonitorDrawerProps) => {
  const { mutateAsync: runCheck, isLoading: isRunCheckLoading } =
    useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost();

  const [graphData, setGraphData] = useState<ChartData<'line', GraphData> | null>(null);
  const [graphFrequency, setGraphFrequency] = useState<SelectValues>(monitor?.frequency || '');
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);
  const [reset, setReset] = useState(false);

  const ref = useRef<MonitorDialogContentRef>();

  const timeFreq = useMemo(() => {
    if (graphFrequency) return +graphFrequency;
    if (monitor) return FrequencyMap[monitor?.frequency as Frequency];
    return frequencyValues.DAY;
  }, [graphFrequency]);

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
    closeDrawer();
  };

  const isCreateAlert = drawerName === DrawerNames.CreateAlert;

  return (
    <StyledDialog
      open={!!open}
      closeDialog={handleOnCloseDrawer}
      title={drawerName}
      submitButtonLabel={isCreateAlert ? 'Save & Activate' : 'Save'}
      submitButtonAction={() => ref.current?.submit()}
      submitButtonDisabled={submitButtonDisabled}
      maxWidth="md"
      fullWidth
    >
      <Stack justifyContent="space-between" height="893px">
        <Box sx={{ height: '650px', overflowY: 'auto' }}>
          {isCreateAlert && monitor ? (
            <CreateAlertForm
              monitor={monitor}
              onClose={closeDrawer}
              runCheckLookBack={handleGraphLookBack}
              setMonitorToRefreshId={setMonitorToRefreshId}
              setSubmitButtonDisabled={setSubmitButtonDisabled}
              ref={ref}
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
              selectedModelId={selectedModelId}
              reset={reset}
              setReset={setReset}
              setSubmitButtonDisabled={setSubmitButtonDisabled}
              ref={ref}
            />
          )}
        </Box>
        <Box height="173px" marginBottom="36.6px">
          <GraphView
            graphData={graphData}
            isLoading={isRunCheckLoading}
            timeFreq={timeFreq}
            monitor={monitor}
            setReset={setReset}
          />
        </Box>
      </Stack>
    </StyledDialog>
  );
};
