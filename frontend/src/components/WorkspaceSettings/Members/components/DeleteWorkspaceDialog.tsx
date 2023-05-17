import React, { useState } from 'react';

import { removeOrganizationApiV1OrganizationDelete } from 'api/generated';

import { StyledDialog, StyledText } from 'components/lib';
import { MembersActionDialogInput } from './MembersActionDialogInput';
import { MembersActionDialogContentLayout } from './MembersActionDialogContentLayout';

import { constants } from '../members.constants';

const { deleteWorkspace, dialogMessage, dialogSubmitButtonLabel, deleteString } = constants.deleteWorkspace;

interface DeleteWorkspaceDialogProps {
  open: boolean;
  closeDialog: () => void;
}

export const DeleteWorkspaceDialog = ({ open, closeDialog }: DeleteWorkspaceDialogProps) => {
  const [inputValue, setInputValue] = useState('');
  const [buttonEnabled, setButtonEnabled] = useState(false);

  const handleInputValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setInputValue(value);
    setButtonEnabled(value.toLowerCase() === deleteString);
  };

  const handleDeleteWorkspace = async () => {
    closeDialog();
    await removeOrganizationApiV1OrganizationDelete();
    window.location.reload();
  };

  return (
    <StyledDialog
      open={open}
      title={deleteWorkspace}
      closeDialog={closeDialog}
      submitButtonLabel={dialogSubmitButtonLabel}
      submitButtonDisabled={!buttonEnabled}
      submitButtonAction={handleDeleteWorkspace}
    >
      <MembersActionDialogContentLayout>
        <StyledText text={dialogMessage} type="h3" textAlign="center" />
        <MembersActionDialogInput value={inputValue} onChange={handleInputValueChange} />
      </MembersActionDialogContentLayout>
    </StyledDialog>
  );
};
