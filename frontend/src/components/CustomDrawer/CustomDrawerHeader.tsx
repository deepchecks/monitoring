import React from 'react';

import { styled, IconButton, Typography, Stack, StackProps } from '@mui/material';

import { CloseIcon } from 'assets/icon/icon';

interface CustomDrawerHeaderProps extends StackProps {
  title: string;
  onClick: () => void;
}

export const CustomDrawerHeader = ({ title, onClick, ...props }: CustomDrawerHeaderProps) => (
  <StyledContainer {...props}>
    <Typography variant="h4">{title}</Typography>
    <IconButton onClick={onClick} sx={{ background: 'transparent' }}>
      <CloseIcon />
    </IconButton>
  </StyledContainer>
);

const StyledContainer = styled(Stack)({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between'
});
