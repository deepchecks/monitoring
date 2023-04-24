import React from 'react';

import { Box, Typography, useTheme } from '@mui/material';

export interface LogoProps {
  withLabel?: boolean;
  labelColor?: 'black' | 'white' | 'gray';
  logoColor?: 'black' | 'white' | 'color';
}

export const Logo = (props: LogoProps) => {
  const { withLabel, labelColor, logoColor } = props;

  const theme = useTheme();

  const logoLabel = 'Deepchecks';

  const logo = require('../../assets/logo/logo.svg').default;
  const logoBlack = require('../../assets/logo/logo-black.svg').default;
  const logoWhite = require('../../assets/logo/logo-white.svg').default;

  const logoToUse = () => {
    switch (logoColor) {
      case 'color':
        return logo;
      case 'black':
        return logoBlack;
      case 'white':
        return logoWhite;
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
        margin: '8px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '16px'
      }}
    >
      <img src={logoToUse()} alt="logo" height={'40px'} />
      {withLabel && (
        <Typography fontSize={16} fontWeight={900} test-id={'logo-text'} color={labelColorToUse()}>
          {logoLabel}
        </Typography>
      )}
    </Box>
  );
};
