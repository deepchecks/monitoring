import React from 'react';

import { styled, IconButton, Typography, Stack, StackProps } from '@mui/material';

import { CloseIcon } from 'assets/icon/icon';

interface AnalysisGroupByHeaderProps extends StackProps {
  title: string;
  onClick: () => void;
}

export const AnalysisGroupByHeader = ({ title, onClick, ...props }: AnalysisGroupByHeaderProps) => (
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
  justifyContent: 'space-between',
  marginBottom: '32px'
});
