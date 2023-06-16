import React, { useState } from 'react';

import { removeOrganizationApiV1OrganizationDelete } from 'api/generated';
import useUser from 'helpers/hooks/useUser';

import { Box } from '@mui/material';

import { StyledDialog, StyledText } from 'components/lib';
import { BaseInput } from 'components/base/InputDropdown/InputDropdown';

import { constants } from '../members.constants';

interface DeleteWorkspaceDialogProps {
  open: boolean;
  closeDialog: () => void;
}

const { deleteWorkspace, dialogMessage1, dialogMessage2, dialogSubmitButtonLabel, inputPlaceholder } =
  constants.deleteWorkspace;

export const DeleteWorkspaceDialog = ({ open, closeDialog }: DeleteWorkspaceDialogProps) => {
  const { user } = useUser();

  const [inputValue, setInputValue] = useState('');
  const [buttonEnabled, setButtonEnabled] = useState(false);

  const handleInputValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setInputValue(value);
    setButtonEnabled(value.toLocaleLowerCase() === user?.organization?.name.toLocaleLowerCase());
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
      <Box textAlign="center">
        <StyledText text={dialogMessage1} type="h3" />
        <StyledText text={dialogMessage2} type="h3" marginBottom="15px" />
        <BaseInput value={inputValue} onChange={handleInputValueChange} placeholder={inputPlaceholder} />
      </Box>
    </StyledDialog>
  );
};
