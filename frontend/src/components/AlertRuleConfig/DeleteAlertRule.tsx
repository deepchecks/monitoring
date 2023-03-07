import React from 'react';

import { AlertRuleConfigSchema, useDeleteAlertRuleApiV1AlertRulesAlertRuleIdDelete } from 'api/generated';

import { Typography, Box } from '@mui/material';

import ActionDialog from 'components/base/Dialog/ActionDialog/ActionDialog';

import { events, reportEvent } from 'helpers/services/mixPanel';
import { constants } from './alertRuleConfig.constants';

interface DeleteAlertRuleProps {
  alertRule: AlertRuleConfigSchema | null;
  open: boolean;
  closeDialog: () => void;
  refetchAlertRules: () => void;
}

export const DeleteAlertRule = ({ alertRule, open, closeDialog, refetchAlertRules }: DeleteAlertRuleProps) => {
  const { mutateAsync: deleteAlertRuleById } = useDeleteAlertRuleApiV1AlertRulesAlertRuleIdDelete();

  const deleteAlertRule = () => {
    if (alertRule) {
      reportEvent(events.alertRulesPage.clickedDeleteRule);
      deleteAlertRuleById({ alertRuleId: alertRule.id }).then(() => refetchAlertRules());
    }

    closeDialog();
  };

  return (
    <ActionDialog
      open={open}
      title={constants.deleteAlertRule.title}
      closeDialog={closeDialog}
      submitButtonLabel={constants.deleteAlertRule.submit}
      submitButtonAction={deleteAlertRule}
      submitButtonAlertType
    >
      <Box margin="16px 0 50px 0">
        <Typography fontSize="16px" textAlign="left">
          {constants.deleteAlertRule.messageStart}
          <Typography component="span" fontWeight={600}>
            {constants.deleteAlertRule.name(alertRule?.name)}
          </Typography>
          {constants.deleteAlertRule.messageEnd}
        </Typography>
      </Box>
    </ActionDialog>
  );
};
