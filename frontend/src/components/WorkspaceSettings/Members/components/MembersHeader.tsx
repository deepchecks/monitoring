import React, { useState, useEffect } from 'react';

import { MemberSchema } from 'api/generated';

import { Stack } from '@mui/material';

import { Input } from 'components/lib/components/Input/Input';
import { Button } from 'components/lib/components/Button/Button';

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import { MembersActionDialogOptions } from '../Members.type';
import { constants } from '../members.constants';

interface MembersHeaderProps {
  organizationMembers: MemberSchema[];
  setMembersList: (value: React.SetStateAction<MemberSchema[]>) => void;
  handleOpenActionDialog: (action: MembersActionDialogOptions, member?: MemberSchema | null) => void;
}

export const MembersHeader = ({ organizationMembers, setMembersList, handleOpenActionDialog }: MembersHeaderProps) => {
  const [searchFieldValue, setSearchFieldValue] = useState('');

  useEffect(() => {
    const filtered = organizationMembers.filter(member =>
      member.full_name?.toLowerCase().includes(searchFieldValue.trim().toLowerCase())
    );
    setMembersList(filtered);
  }, [searchFieldValue]);

  const inviteMember = () => handleOpenActionDialog(MembersActionDialogOptions.invite);

  return (
    <Stack direction="row" spacing="16px" marginBottom="16px">
      <Input
        placeholder={constants.header.title}
        value={searchFieldValue}
        setValue={setSearchFieldValue}
        searchField
        fullWidth
        sx={{ flex: 1 }}
      />
      <Button startIcon={<AddCircleOutlineIcon fill="white" />} label="Invite Members" onClick={inviteMember} />
    </Stack>
  );
};
