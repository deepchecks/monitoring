import React, { useState } from 'react';

import { MemberSchema } from 'api/generated';

import { Stack, Checkbox, alpha, styled } from '@mui/material';
import { StyledText } from 'components/lib';

interface EditMembersDialogItemProps {
  member: MemberSchema;
}

export const StyledContainer = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  cursor: 'pointer',
  padding: '12px 0',
  borderRadius: '5px',

  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1)
  }
}));

export const EditMembersDialogItem = ({ member }: EditMembersDialogItemProps) => {
  const [checked, setChecked] = useState(false);

  const handleClick = () => setChecked(!checked);

  return (
    <StyledContainer onClick={handleClick}>
      <Checkbox checked={checked} sx={{ marginRight: '15px' }} />
      <Stack>
        <StyledText type="h3" text={member.full_name} sx={{ fontWeight: 700, marginBottom: '3px' }} />
        <StyledText type="smallNormal" text={member.email} />
      </Stack>
    </StyledContainer>
  );
};
