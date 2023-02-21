import React from 'react';
import { WarningIcon } from 'assets/icon/icon';
import { Stack, styled, Typography } from '@mui/material';
import { colors } from 'theme/colors';

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
  color: colors.neutral.white,
  backgroundColor: colors.semantic.salmon,
  width: '44px',
  height: '24px',
  borderRadius: '30px'
});
