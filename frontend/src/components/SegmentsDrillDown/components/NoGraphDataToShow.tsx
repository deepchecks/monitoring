import React from 'react';

import { styled, Typography } from '@mui/material';

import { GraphLayout } from './GraphLayout';

export const NoGraphDataToShow = () => (
  <GraphLayout>
    <StyledNoDataMessage>No data to show</StyledNoDataMessage>
  </GraphLayout>
);

const StyledNoDataMessage = styled(Typography)(({ theme }) => ({
  fontSize: '20px',
  textAlign: 'center',
  color: theme.palette.text.disabled
}));
