import React from 'react';

import { DialogProps } from '@mui/material/Dialog';

import { StyledDialog, StyledText } from 'components/lib';

interface ActiveAlertsModalProps extends DialogProps {
  setActiveAlertsModalOpen: (value: React.SetStateAction<boolean>) => void;
  handleActiveAlertResolve: () => void;
}

export const ActiveAlertsModal = ({
  setActiveAlertsModalOpen,
  handleActiveAlertResolve,
  ...props
}: ActiveAlertsModalProps) => (
  <StyledDialog
    title="Confirmation"
    closeDialog={() => setActiveAlertsModalOpen(false)}
    submitButtonLabel="OK"
    submitButtonAction={handleActiveAlertResolve}
    {...props}
  >
    <StyledText
      text="This monitor has active alerts connected to it. In order to edit the monitor, all alerts must be resolved first.Are you sure you want to edit this monitor and resolve all alerts connected to it?"
      type="h3"
    />
  </StyledDialog>
);
