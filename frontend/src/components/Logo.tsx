import React, { FC } from 'react';
import { Box } from '@mui/material';
import { Logo as LargeLogo, ColoredLogo } from '../assets/logo';
// isColored property is used on CompleteDetails page
interface LogoProps {
  isColored?: boolean;
}

export const Logo: FC<LogoProps> = ({ isColored }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      paddingTop: '40px',
      cursor: 'pointer',
      width: isColored ? '280px' : 'unset'
    }}
  >
    {isColored ? <ColoredLogo /> : <LargeLogo />}
  </Box>
);
