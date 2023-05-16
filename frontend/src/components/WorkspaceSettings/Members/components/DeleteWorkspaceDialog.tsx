import React from 'react';

import { StyledDeletionDialog } from 'components/lib';

import { constants } from '../members.constants';

const { deleteWorkspace, dialogMessage, dialogSubmitButtonLabel } = constants.deleteWorkspace;

interface DeleteWorkspaceDialogProps {
  open: boolean;
  closeDialog: () => void;
}

export const DeleteWorkspaceDialog = ({ open, closeDialog }: DeleteWorkspaceDialogProps) => {
  return (
    <StyledDeletionDialog
      open={open}
      closeDialog={closeDialog}
      title={deleteWorkspace}
      submitButtonLabel={dialogSubmitButtonLabel}
      submitButtonAction={closeDialog}
      messageStart={dialogMessage}
    />
  );
};
