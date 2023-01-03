import React from 'react';

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DialogProps } from '@mui/material/Dialog';

interface ActiveAlertsModalProps extends DialogProps {
  setActiveAlertsModalOpen: (value: React.SetStateAction<boolean>) => void;
  handleActiveAlertResolve: () => void;
}

export const ActiveAlertsModal = ({
  setActiveAlertsModalOpen,
  handleActiveAlertResolve,
  ...props
}: ActiveAlertsModalProps) => (
  <Dialog {...props}>
    <DialogTitle>Confirmation</DialogTitle>
    <DialogContent dividers>
      <Typography>
        This monitor has active alerts connected to it. In order to edit the monitor, all alerts must be resolved first.
        Are you sure you want to edit this monitor and resolve all alerts connected to it?
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={() => setActiveAlertsModalOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleActiveAlertResolve}>OK</Button>
    </DialogActions>
  </Dialog>
);
