import React, { useState } from 'react';

import { MemberSchema } from 'api/generated';

import { Box, Stack } from '@mui/material';

import { SearchField } from 'components/base/Input/SearchField';
import { MUIBaseButton } from 'components/base/Button/MUIBaseButton';

import { MembersActionDialogOptions } from '../Members.type';
import { constants } from '../members.constants';

interface MembersHeaderProps {
  organizationMembers: MemberSchema[];
  setMembersList: (value: React.SetStateAction<MemberSchema[]>) => void;
  handleOpenActionDialog: (action: MembersActionDialogOptions, member?: MemberSchema | null) => void;
}

export const MembersHeader = ({ organizationMembers, setMembersList, handleOpenActionDialog }: MembersHeaderProps) => {
  const [searchFieldValue, setSearchFieldValue] = useState('');

  const filterMembers = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    const filtered = organizationMembers.filter(member =>
      member.full_name?.toLowerCase().includes(value.trim().toLowerCase())
    );

    setMembersList(filtered);
    setSearchFieldValue(value);
  };

  const handleResetSearchField = () => {
    setSearchFieldValue('');
    setMembersList(organizationMembers);
  };

  const inviteMember = () => handleOpenActionDialog(MembersActionDialogOptions.invite);

  return (
    <Stack direction="row" spacing="16px" marginBottom="16px">
      <Box sx={{ flex: 1 }}>
        <SearchField
          size="small"
          fullWidth
          placeholder={constants.header.title}
          value={searchFieldValue}
          onChange={filterMembers}
          onReset={handleResetSearchField}
        />
      </Box>
      <MUIBaseButton onClick={inviteMember}>Invite Member</MUIBaseButton>
    </Stack>
  );
};
