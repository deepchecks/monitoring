import React, { useState } from 'react';

import { Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import { StyledButton, StyledDeletionDialog, StyledText } from 'components/lib';

import { constants } from '../members.constants';

const { title, description, deleteWorkspace, dialogMessage, dialogSubmitButtonLabel } = constants.deleteWorkspace;

export const DeleteWorkspace = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const openDialog = () => setDialogOpen(true);
  const closeDialog = () => setDialogOpen(false);

  return (
    <Box marginBottom="36px">
      <StyledText type="h1" text={title} marginBottom="16px" />
      <StyledText text={description} marginBottom="24px" />
      <StyledButton startIcon={<DeleteIcon />} label={deleteWorkspace} color="error" onClick={openDialog} />
      <StyledDeletionDialog
        open={dialogOpen}
        closeDialog={closeDialog}
        title={deleteWorkspace}
        submitButtonLabel={dialogSubmitButtonLabel}
        submitButtonAction={closeDialog}
        messageStart={dialogMessage}
      />
    </Box>
  );
};
