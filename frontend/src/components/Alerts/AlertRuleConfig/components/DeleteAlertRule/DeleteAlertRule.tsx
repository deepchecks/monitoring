import React from 'react';

import { AlertRuleConfigSchema, useDeleteAlertRuleApiV1AlertRulesAlertRuleIdDelete } from 'api/generated';

import { StyledDeletionDialog } from 'components/lib';

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
    alertRule && deleteAlertRuleById({ alertRuleId: alertRule.id }).then(() => refetchAlertRules());

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
