import React from 'react';

import { RoleEnum, MemberSchema } from 'api/generated';
import useUser from 'helpers/hooks/useUser';

import { Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import { StyledButton, StyledText } from 'components/lib';

import { MembersActionDialogOptions } from '../Members.type';
import { constants } from '../members.constants';

const { title, description, deleteWorkspace } = constants.deleteWorkspace;

interface DeleteWorkspaceProps {
  handleOpenActionDialog: (action: MembersActionDialogOptions, member?: MemberSchema | null) => void;
}

export const DeleteWorkspace = ({ handleOpenActionDialog }: DeleteWorkspaceProps) => {
  const { user } = useUser();

  const handleDeleteWorkspace = () => handleOpenActionDialog(MembersActionDialogOptions.deleteWorkspace);

  return (
    <Box marginBottom="36px">
      <StyledText type="h1" text={title} marginBottom="16px" />
      <StyledText text={description} marginBottom="24px" />
      <StyledButton
        startIcon={<DeleteIcon />}
        label={deleteWorkspace}
        color="error"
        onClick={handleDeleteWorkspace}
        disabled={!user?.roles.includes(RoleEnum.owner)}
      />
    </Box>
  );
};
