import React, { useState, useEffect } from 'react';

import { MemberSchema } from 'api/generated';

import { Stack } from '@mui/material';

import { Input } from 'components/lib/components/Input/Input';
import { StyledButton } from 'components/lib';

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

  useEffect(() => {
    const filtered = organizationMembers.filter(member =>
      member.full_name?.toLowerCase().includes(searchFieldValue.trim().toLowerCase())
    );
    setMembersList(filtered);
  }, [searchFieldValue]);

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
      <Input
        placeholder={title}
        value={searchFieldValue}
        setValue={setSearchFieldValue}
        searchField
        fullWidth
        sx={{ flex: 1 }}
      />
      <StyledButton startIcon={<AddCircleOutlineIcon />} label={inviteMembers} onClick={handleInviteMember} />
    </Stack>
  );
};
