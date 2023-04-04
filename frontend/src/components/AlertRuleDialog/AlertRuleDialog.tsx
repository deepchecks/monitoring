import { Dialog, DialogProps } from '@mui/material';
import {
  AlertRuleConfigSchema,
  useCreateAlertRuleApiV1MonitorsMonitorIdAlertRulesPost,
  useCreateMonitorApiV1ChecksCheckIdMonitorsPost,
  useGetAlertRuleApiV1AlertRulesAlertRuleIdGet,
  useGetMonitorApiV1MonitorsMonitorIdGet,
  useUpdateAlertApiV1AlertRulesAlertRuleIdPut,
  useUpdateMonitorApiV1MonitorsMonitorIdPut
} from 'api/generated';
import { Loader } from 'components/Loader';
import React, { useContext, useEffect } from 'react';
import { AlertRuleDialogContent } from './AlertRuleDialogContent';
import { AlertRuleDialogContext } from './AlertRuleDialogContext';
import { DialogTopBar } from './DialogTopBar';

interface AlertRuleDialogProps extends Omit<DialogProps, 'onClose'> {
  alertRuleId?: AlertRuleConfigSchema['id'];
  onClose: (isRefetch?: boolean) => void;
  startingStep?: number;
}

export const AlertRuleDialog = ({ alertRuleId = 0, onClose, startingStep, ...props }: AlertRuleDialogProps) => {
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
  const { setAlertRule, setMonitor, resetState, monitor, alertRule } = useContext(AlertRuleDialogContext);

  useEffect(() => {
    if (fetchedAlertRule) {
      setAlertRule(fetchedAlertRule);
    }
    if (fetchedMonitor) {
      setMonitor(fetchedMonitor);
    }
  }, [fetchedAlertRule, fetchedMonitor, setAlertRule, setMonitor]);

  const handleClose = () => {
    onClose(false);
    resetState();
  };

  const handleComplete = async () => {
    // Edit mode
    if (alertRuleId !== 0) {
      const { id: monitorId, ...editedMonitor } = monitor;

      await Promise.all([
        updateMonitor({ monitorId, data: editedMonitor }),
        updateAlertRule({ alertRuleId, data: alertRule })
      ]);

      // trackAddEditRuleSavedSuccessfully(monitor);
    } else {
      const { check, ...addedMonitor } = monitor;
      const { id: monitorId } = await createMonitor({ checkId: check.id, data: addedMonitor });

      await createAlertRule({ monitorId, data: alertRule });

      // trackAddEditRuleSavedSuccessfully(monitor);
    }

    onClose(true);
    resetState();
  };

  const isLoading =
    (alertRuleId !== 0 && (isAlertRuleLoading || isMonitorLoading)) ||
    isCreateMonitorLoading ||
    isCreateAlertRuleLoading ||
    isUpdateMonitorLoading ||
    isUpdateAlertRuleLoading;
  return (
    <Dialog
      fullWidth={true}
      maxWidth={false}
      // TransitionComponent={Transition}
      onClose={() => handleClose()}
      {...props}
      sx={{ '& .MuiDialog-paper': { p: '0 40px' } }}
    >
      {isLoading ? (
        <Loader />
      ) : (
        <>
          <DialogTopBar handleClose={handleClose} />
          <AlertRuleDialogContent startingStep={startingStep} handleComplete={handleComplete} />
        </>
      )}
    </Dialog>
  );
};
