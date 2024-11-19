import React from 'react';

import { DialogProps } from '@mui/material/Dialog';

import { StyledDialog, StyledText } from 'components/lib';

import { constants } from '../monitorDialog.constants';

interface ActiveAlertsModalProps extends DialogProps {
  setActiveAlertsModalOpen: (value: React.SetStateAction<boolean>) => void;
  handleActiveAlertResolve: () => void;
}

const { message, submitButtonLabel, title } = constants.activeAlertsModal;

export const ActiveAlertsModal = ({
  setActiveAlertsModalOpen,
  handleActiveAlertResolve,
  ...props
}: ActiveAlertsModalProps) => (
  <StyledDialog
    title={title}
    closeDialog={() => setActiveAlertsModalOpen(false)}
    submitButtonLabel={submitButtonLabel}
    submitButtonAction={handleActiveAlertResolve}
    {...props}
  >
    <StyledText text={message} type="h3" />
  </StyledDialog>
);
