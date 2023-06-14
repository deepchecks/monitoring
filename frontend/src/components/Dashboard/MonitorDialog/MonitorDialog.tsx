import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ChartData } from 'chart.js';

import {
  useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost,
  MonitorOptions,
  MonitorSchema,
  Frequency
} from 'api/generated';

import { Stack, Box } from '@mui/material';

import { MonitorDialogGraph as GraphView } from './components/MonitorDialogGraph';
import { MonitorForm } from './components/MonitorForm';
import { CreateAlertForm } from './components/CreateAlertForm';
import { StyledDialog } from 'components/lib';

import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';
import { DialogNames } from '../Dashboard.types';
import { GraphData } from 'helpers/types';
import { SelectValues } from 'helpers/types';
import { FrequencyMap, frequencyValues } from 'helpers/utils/frequency';
import { constants } from './monitorDialog.constants';

interface MonitorDialogContentRef extends HTMLElement {
  submit(): void;
}

interface MonitorDialogProps {
  open: boolean;
  monitor: MonitorSchema | null;
  dialogName: DialogNames;
  setMonitorToRefreshId: React.Dispatch<React.SetStateAction<number | null>>;
  onClose: () => void;
  refetchMonitors(): void;
  selectedModelId: number | null;
}

export const MonitorDialog = ({
  monitor,
  dialogName,
  setMonitorToRefreshId,
  open,
  onClose,
  refetchMonitors,
  selectedModelId
}: MonitorDialogProps) => {
  const { mutateAsync: runCheck, isLoading: isRunCheckLoading } =
    useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost();

  const [activeStep, setActiveStep] = useState(0);
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

  const closeDialog = () => {
    onClose();
    setTimeout(() => {
      setActiveStep(0);
      setGraphData(null);
    }, 150);
  };

  const handleCloseDialog = () => closeDialog();

  const isCreateAlert = dialogName === DialogNames.CreateAlert;

  const handleSubmit = () => {
    if (isCreateAlert) {
      ref.current?.submit();
    } else {
      activeStep === 1 ? ref.current?.submit() : setActiveStep(1);
    }
  };

  const handleCancel = () => {
    if (isCreateAlert) {
      handleCloseDialog();
    } else {
      activeStep === 0 ? handleCloseDialog() : setActiveStep(0);
    }
  };

  return (
    <StyledDialog
      open={!!open}
      closeDialog={handleCloseDialog}
      title={dialogName}
      submitButtonLabel={constants.submitButtonLabel(isCreateAlert, activeStep)}
      submitButtonAction={handleSubmit}
      submitButtonDisabled={submitButtonDisabled}
      cancelButtonAction={handleCancel}
      cancelButtonLabel={constants.cancelButtonLabel(activeStep)}
      maxWidth="sm"
    >
      <Stack justifyContent="space-between">
        <Box sx={{ maxHeight: 'calc(100vh - 500px)', overflowY: 'auto', marginTop: '-20px' }}>
          {isCreateAlert && monitor ? (
            <CreateAlertForm
              monitor={monitor}
              onClose={closeDialog}
              runCheckLookBack={handleGraphLookBack}
              setMonitorToRefreshId={setMonitorToRefreshId}
              setSubmitButtonDisabled={setSubmitButtonDisabled}
              ref={ref}
            />
          ) : (
            <MonitorForm
              activeStep={activeStep}
              monitor={monitor}
              refetchMonitors={refetchMonitors}
              setMonitorToRefreshId={setMonitorToRefreshId}
              handleCloseDialog={closeDialog}
              runCheckLookBack={handleGraphLookBack}
              isDialogOpen={!!open}
              setGraphFrequency={setGraphFrequency}
              selectedModelId={selectedModelId}
              reset={reset}
              setReset={setReset}
              setSubmitButtonDisabled={setSubmitButtonDisabled}
              ref={ref}
            />
          )}
        </Box>
        <Box height="246px" marginBottom="36px">
          <GraphView
            graphData={graphData}
            isLoading={isRunCheckLoading}
            timeFreq={timeFreq}
            monitor={monitor}
            setReset={setReset}
            isCreateAlert={isCreateAlert}
          />
        </Box>
      </Stack>
    </StyledDialog>
  );
};
