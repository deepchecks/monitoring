import React from 'react';

import { Typography, Box } from '@mui/material';

import ActionDialog, { ActionDialogProps } from 'components/base/Dialog/ActionDialog/ActionDialog';

interface DeleteActionDialogProps extends ActionDialogProps {
  messageStart: string;
  itemNameToDelete: string;
  messageEnd: string;
}

export const DeleteActionDialog = ({
  messageStart,
  itemNameToDelete,
  messageEnd,
  ...props
}: DeleteActionDialogProps) => (
  <ActionDialog {...props} submitButtonAlertType>
    <Box margin="16px 0 50px 0">
      <Typography fontSize="16px" textAlign="left">
        {messageStart}
        <Typography component="span" fontWeight={600}>
          {itemNameToDelete}
        </Typography>
        {messageEnd}
      </Typography>
    </Box>
  </ActionDialog>
);
