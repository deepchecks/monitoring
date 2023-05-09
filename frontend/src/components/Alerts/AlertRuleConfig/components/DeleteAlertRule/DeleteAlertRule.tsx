import React from 'react';

import { AlertRuleConfigSchema, useDeleteAlertRuleApiV1AlertRulesAlertRuleIdDelete } from 'api/generated';

import { DeletionDialog as StyledDeletionDialog } from 'components/lib/components/Dialog/DeletionDialog';

import { events, reportEvent } from 'helpers/services/mixPanel';
import { constants } from '../../alertRuleConfig.constants';

const { messageEnd, messageStart, name, submit, title } = constants.deleteAlertRule;

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
    <StyledDeletionDialog
      open={open}
      title={title}
      closeDialog={closeDialog}
      submitButtonLabel={submit}
      submitButtonAction={deleteAlertRule}
      messageStart={messageStart}
      itemToDelete={name(alertRule?.name)}
      messageEnd={messageEnd}
    />
  );
};
