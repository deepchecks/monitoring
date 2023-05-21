import React, { useState } from 'react';

import { MemberSchema } from 'api/generated';

import { Stack } from '@mui/material';

import { StyledButton, StyledInput } from 'components/lib';

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import ModeEditIcon from '@mui/icons-material/ModeEdit';

import { MembersActionDialogOptions } from '../Members.type';
import { constants } from '../members.constants';

interface MembersHeaderProps {
  organizationMembers: MemberSchema[];
  setMembersList: (value: React.SetStateAction<MemberSchema[]>) => void;
  handleOpenActionDialog: (action: MembersActionDialogOptions, member?: MemberSchema | null) => void;
  actionButtonsDisabled: boolean;
}

const { title, assignModels, removeMembers, inviteMembers } = constants.header;

export const MembersHeader = ({
  organizationMembers,
  setMembersList,
  handleOpenActionDialog,
  actionButtonsDisabled
}: MembersHeaderProps) => {
  const [searchFieldValue, setSearchFieldValue] = useState('');

  const handleSearchFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setSearchFieldValue(value);
    setMembersList(
      organizationMembers.filter(member => member.full_name?.toLowerCase().includes(value.trim().toLowerCase()))
    );
  };

  const resetSearchField = () => {
    setSearchFieldValue('');
    setMembersList(organizationMembers);
  };

  const handleInviteMember = () => handleOpenActionDialog(MembersActionDialogOptions.invite);

  const handleRemoveSelectedMembers = () => handleOpenActionDialog(MembersActionDialogOptions.removeSelected);

  const handleAssignModel = () => handleOpenActionDialog(MembersActionDialogOptions.assignModel);

  return (
    <Stack direction="row" spacing="16px" marginBottom="16px">
      <StyledButton
        startIcon={<ModeEditIcon />}
        label={assignModels}
        disabled={actionButtonsDisabled}
        onClick={handleAssignModel}
      />
      <StyledButton
        startIcon={<DeleteIcon />}
        label={removeMembers}
        disabled={actionButtonsDisabled}
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
