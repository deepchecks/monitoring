import React from 'react';

import { Box, Typography, useTheme } from '@mui/material';

export interface LogoProps {
  withLabel?: boolean;
  labelColor?: 'black' | 'white' | 'gray';
  logoColor?: 'black' | 'white' | 'color' | 'mon';
  margin?: string;
}

export const Logo = (props: LogoProps) => {
  const { withLabel, labelColor, logoColor, margin = '8px' } = props;

  const theme = useTheme();

  const logoLabel = 'Deepchecks';

  const logo = require('../../assets/logo/logo.svg').default;
  const logoBlack = require('../../assets/logo/logo-black.svg').default;
  const logoWhite = require('../../assets/logo/logo-white.svg').default;
  const logoMon = require('../../assets/logo/monitoring.svg').default;

  const logoToUse = () => {
    switch (logoColor) {
      case 'color':
        return logo;
      case 'black':
        return logoBlack;
      case 'white':
        return logoWhite;
      case 'mon':
        return logoMon;
      default:
        return logo;
    }
  };

  const labelColorToUse = () => {
    switch (labelColor) {
      case 'gray':
        return theme.palette.grey[400];
      case 'black':
        return theme.palette.common.black;
      case 'white':
        return theme.palette.common.white;
      default:
        return '';
    }
  };

  return (
    <Box
      sx={{
        margin: margin,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '16px'
      }}
    >
      <img src={logoToUse()} alt="logo" height="40px" width="200px" />
      {withLabel && (
        <Typography fontSize={16} fontWeight={900} test-id={'logo-text'} color={labelColorToUse()}>
          {logoLabel}
        </Typography>
      )}
    </Box>
  );
};
