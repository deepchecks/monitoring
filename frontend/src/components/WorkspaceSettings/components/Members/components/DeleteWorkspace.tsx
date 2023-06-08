import React from 'react';

import { MemberSchema } from 'api/generated';
import useUser from 'helpers/hooks/useUser';

import { Tooltip, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import { StyledButton, StyledText } from 'components/lib';

import { MembersActionDialogOptions } from '../Members.type';
import { constants } from '../members.constants';

const { description, deleteWorkspace } = constants.deleteWorkspace;

interface DeleteWorkspaceProps {
  handleOpenActionDialog: (action: MembersActionDialogOptions, member?: MemberSchema | null) => void;
}

export const DeleteWorkspace = ({ handleOpenActionDialog }: DeleteWorkspaceProps) => {
  const { isOwner } = useUser();

  const handleDeleteWorkspace = () => handleOpenActionDialog(MembersActionDialogOptions.deleteWorkspace);

  return (
    <Tooltip title={<StyledText text={description} color="red" padding={'8px'} />} placement="top-start" arrow>
      <Box width="250px">
        <StyledButton
          startIcon={<DeleteIcon />}
          label={deleteWorkspace}
          color="error"
          onClick={handleDeleteWorkspace}
          disabled={!isOwner}
        />
      </Box>
    </Tooltip>
  );
};
