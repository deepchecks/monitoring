import React, { useContext, useEffect } from 'react';

import {
  AlertRuleConfigSchema,
  useCreateAlertRuleApiV1MonitorsMonitorIdAlertRulesPost,
  useCreateMonitorApiV1ChecksCheckIdMonitorsPost,
  useGetAlertRuleApiV1AlertRulesAlertRuleIdGet,
  useGetMonitorApiV1MonitorsMonitorIdGet,
  useUpdateAlertApiV1AlertRulesAlertRuleIdPut,
  useUpdateMonitorApiV1MonitorsMonitorIdPut
} from 'api/generated';

import { AlertRuleDialogContent } from './AlertRuleDialogContent';
import { AlertRuleDialogContext } from './AlertRuleDialogContext';

import { Dialog, DialogProps } from '@mui/material';

import { ActionDialogHeader } from 'components/base/Dialog/ActionDialog/ActionDialogHeader';
import { Loader } from 'components/Loader';

interface AlertRuleDialogProps extends Omit<DialogProps, 'onClose'> {
  alertRuleId?: AlertRuleConfigSchema['id'];
  onClose: (isRefetch?: boolean) => void;
  startingStep?: number;
}

export const AlertRuleDialog = ({ alertRuleId = 0, onClose, startingStep, ...props }: AlertRuleDialogProps) => {
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

  useEffect(() => {
    if (fetchedAlertRule) setAlertRule(fetchedAlertRule);
  }, [fetchedAlertRule, setAlertRule]);

  useEffect(() => {
    if (fetchedMonitor) setMonitor(fetchedMonitor);
  }, [fetchedMonitor, setMonitor]);

  const handleClose = () => {
    onClose(false);
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
      onClose={handleClose}
      sx={{ '& .MuiDialog-paper': { width: '603px', padding: '40px 32px', borderRadius: '20px' } }}
      {...props}
    >
      {isLoading ? (
        <Loader />
      ) : (
        <>
          <ActionDialogHeader
            title={monitor?.name ? `Edit Alert Rule: ${monitor?.name}` : 'Create New Alert Rule'}
            onClose={handleClose}
          />
          <AlertRuleDialogContent startingStep={startingStep} handleComplete={handleComplete} />
        </>
      )}
    </Dialog>
  );
};
