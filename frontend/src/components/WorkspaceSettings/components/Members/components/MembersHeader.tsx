import React from 'react';

import { MemberSchema } from 'api/generated';

import { Stack } from '@mui/material';

import { StyledButton, StyledInput } from 'components/lib';

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';

import { useListSearchField } from 'helpers/hooks/useListSearchField';
import { MembersActionDialogOptions } from '../Members.type';
import { constants } from '../members.constants';

interface MembersHeaderProps {
  initialMembersList: MemberSchema[];
  setMembersList: (value: React.SetStateAction<MemberSchema[]>) => void;
  handleOpenActionDialog: (action: MembersActionDialogOptions, member?: MemberSchema | null) => void;
  removeMultipleMembersDisabled: boolean;
  assignModelsButtonDisabled: boolean;
}

const { title, removeMembers, inviteMembers } = constants.header;

export const MembersHeader = ({
  initialMembersList,
  setMembersList,
  handleOpenActionDialog,
  removeMultipleMembersDisabled
}: MembersHeaderProps) => {
  const { searchFieldValue, handleSearchFieldChange, resetSearchField } = useListSearchField<MemberSchema>(
    initialMembersList,
    setMembersList,
    'full_name'
  );

  const handleInviteMember = () => handleOpenActionDialog(MembersActionDialogOptions.invite);

  const handleRemoveSelectedMembers = () => handleOpenActionDialog(MembersActionDialogOptions.removeSelected);

  return (
    <Stack direction="row" spacing="16px" marginBottom="16px">
      <StyledButton
        startIcon={<DeleteIcon />}
        label={removeMembers}
        disabled={removeMultipleMembersDisabled}
        onClick={handleRemoveSelectedMembers}
      />
      <StyledInput
        placeholder={title}
        value={searchFieldValue}
        onChange={handleSearchFieldChange}
        onCloseIconClick={resetSearchField}
        searchField
        fullWidth
        sx={{ flex: 1 }}
      />
      <StyledButton startIcon={<AddCircleOutlineIcon />} label={inviteMembers} onClick={handleInviteMember} />
    </Stack>
  );
};
