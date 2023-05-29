import React from 'react';

import { Stack, Checkbox, alpha, styled, StackProps } from '@mui/material';
import { StyledText } from 'components/lib';

interface DialogListItemProps extends StackProps {
  title: string;
  subtitle: string;
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

export const DialogListItem = ({ title, subtitle, selected, ...otherProps }: DialogListItemProps) => {
  return (
    <StyledContainer {...otherProps}>
      <Checkbox checked={selected} sx={{ marginRight: '15px' }} />
      <Stack>
        <StyledText type="h3" text={title} sx={{ fontWeight: 700, marginBottom: '3px' }} />
        <StyledText type="smallNormal" text={subtitle} />
      </Stack>
    </StyledContainer>
  );
};
