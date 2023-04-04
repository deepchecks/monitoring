import React from 'react';
import { WarningIcon } from 'assets/icon/icon';
import { Stack, styled, Typography } from '@mui/material';

import { theme } from 'theme';

interface WarningLabelProps {
  numberOfAlerts: number;
}

export const WarningLabel = ({ numberOfAlerts }: WarningLabelProps) => (
  <StyledWarningLabel spacing="5px" direction="row" alignItems="center" justifyContent="center">
    <WarningIcon />
    <Typography sx={{ fontSize: '14px' }} component="span">
      {numberOfAlerts}
    </Typography>
  </StyledWarningLabel>
);

const StyledWarningLabel = styled(Stack)({
  color: theme.palette.common.white,
  backgroundColor: 'DD5841',
  width: '44px',
  height: '24px',
  borderRadius: '30px'
});
