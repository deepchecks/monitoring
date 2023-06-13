import React, { useContext, useEffect, useState, useRef } from 'react';

import {
  AlertRuleConfigSchema,
  useCreateAlertRuleApiV1MonitorsMonitorIdAlertRulesPost,
  useCreateMonitorApiV1ChecksCheckIdMonitorsPost,
  useGetAlertRuleApiV1AlertRulesAlertRuleIdGet,
  useGetMonitorApiV1MonitorsMonitorIdGet,
  useUpdateAlertApiV1AlertRulesAlertRuleIdPut,
  useUpdateMonitorApiV1MonitorsMonitorIdPut
} from 'api/generated';

import { AlertRuleDialogContent } from './components/AlertRuleDialogContent';
import { AlertRuleDialogContext } from './AlertRuleDialogContext';

import { DialogProps } from '@mui/material';

import { Loader } from 'components/base/Loader/Loader';
import { StyledDialog } from 'components/lib';

import { constants } from './alertRuleDialog.constants';

interface AlertRuleDialogProps extends Omit<DialogProps, 'onClose'> {
  open: boolean;
  alertRuleId?: AlertRuleConfigSchema['id'];
  onClose: (isRefetch?: boolean) => void;
  startingStep?: number;
  isDataAlert?: boolean;
}

interface AlertRuleDialogContentRef extends HTMLDivElement {
  next(): void;
}

const {
  dialogHeader,
  buttons: { back, next },
  content: {
    stepTitles: { basic, monitor, rule }
  }
} = constants;

const MODEL_STEPS = [basic, monitor, rule];
const DATA_STEPS = [basic, rule];

export const AlertRuleDialog = ({
  open,
  alertRuleId = 0,
  onClose,
  startingStep = 0,
  isDataAlert,
  ...props
}: AlertRuleDialogProps) => {
  const { setAlertRule, setMonitor, resetState, monitor, alertRule } = useContext(AlertRuleDialogContext);

  const { data: fetchedAlertRule, isLoading: isAlertRuleLoading } =
    useGetAlertRuleApiV1AlertRulesAlertRuleIdGet(alertRuleId);
  const { data: fetchedMonitor, isLoading: isMonitorLoading } = useGetMonitorApiV1MonitorsMonitorIdGet(
    fetchedAlertRule?.monitor_id || 0
  );

  const { mutateAsync: createMonitor, isLoading: isCreateMonitorLoading } =
    useCreateMonitorApiV1ChecksCheckIdMonitorsPost();
  const { mutateAsync: createAlertRule, isLoading: isCreateAlertRuleLoading } =
    useCreateAlertRuleApiV1MonitorsMonitorIdAlertRulesPost();

  const { mutateAsync: updateMonitor, isLoading: isUpdateMonitorLoading } = useUpdateMonitorApiV1MonitorsMonitorIdPut();
  const { mutateAsync: updateAlertRule, isLoading: isUpdateAlertRuleLoading } =
    useUpdateAlertApiV1AlertRulesAlertRuleIdPut();

  const [activeStep, setActiveStep] = useState(startingStep);
  const [nextButtonDisabled, setNextButtonDisabled] = useState(false);

  const ref = useRef<AlertRuleDialogContentRef>();

  const STEPS = isDataAlert ? DATA_STEPS : MODEL_STEPS;

  useEffect(() => {
    if (fetchedAlertRule) setAlertRule(fetchedAlertRule);
  }, [fetchedAlertRule, setAlertRule]);

  useEffect(() => {
    if (fetchedMonitor) setMonitor(fetchedMonitor);
  }, [fetchedMonitor, setMonitor]);

  const handleClose = () => {
    onClose(true);
    setActiveStep(startingStep);
    resetState();
  };

  const handleComplete = async () => {
    if (alertRuleId !== 0) {
      const { id: monitorId, ...editedMonitor } = monitor;

      await Promise.all([
        updateMonitor({ monitorId, data: editedMonitor }),
        updateAlertRule({ alertRuleId, data: alertRule })
      ]);
    } else {
      const { check, ...addedMonitor } = monitor;
      const { id: monitorId } = await createMonitor({ checkId: check.id, data: addedMonitor });

      await createAlertRule({ monitorId, data: alertRule });
    }

    handleClose();
  };

  const handleNext = () => {
    ref.current?.next();
    activeStep === STEPS.length - 1 ? handleComplete() : setActiveStep(prevActiveStep => prevActiveStep + 1);
  };

  const handleBack = () => (activeStep === 0 ? handleClose() : setActiveStep(prevActiveStep => prevActiveStep - 1));

  const isLoading =
    (alertRuleId !== 0 && (isAlertRuleLoading || isMonitorLoading)) ||
    isCreateMonitorLoading ||
    isCreateAlertRuleLoading ||
    isUpdateMonitorLoading ||
    isUpdateAlertRuleLoading;

  return (
    <StyledDialog
      open={open}
      title={dialogHeader(monitor?.name)}
      closeDialog={handleClose}
      submitButtonLabel={next(activeStep === 2)}
      cancelButtonLabel={back(activeStep === 0)}
      submitButtonAction={handleNext}
      cancelButtonAction={handleBack}
      submitButtonDisabled={nextButtonDisabled}
      {...props}
    >
      {isLoading ? (
        <Loader />
      ) : (
        <AlertRuleDialogContent
          activeStep={activeStep}
          steps={STEPS}
          setNextButtonDisabled={setNextButtonDisabled}
          ref={ref}
          isDataAlert={isDataAlert}
        />
      )}
    </StyledDialog>
  );
};
