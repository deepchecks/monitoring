import React from 'react';

import { MemberSchema } from 'api/generated';

import { Stack, Checkbox, alpha, styled, StackProps } from '@mui/material';
import { StyledText } from 'components/lib';

interface AssignMembersToModelDialogItemProps extends StackProps {
  member: MemberSchema;
  selected: boolean;
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

export const AssignMembersToModelDialogItem = ({
  member,
  selected,
  ...otherProps
}: AssignMembersToModelDialogItemProps) => {
  return (
    <StyledContainer {...otherProps}>
      <Checkbox checked={selected} sx={{ marginRight: '15px' }} />
      <Stack>
        <StyledText type="h3" text={member.full_name} sx={{ fontWeight: 700, marginBottom: '3px' }} />
        <StyledText type="smallNormal" text={member.email} />
      </Stack>
    </StyledContainer>
  );
};
