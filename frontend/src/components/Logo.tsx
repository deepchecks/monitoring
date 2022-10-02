import { Box } from '@mui/material';
import React, { FC } from 'react';
import { ColoredLogo, Logo as LargeLogo } from '../assets/logo';
// isColored property is used on CompleteDetails page
interface LogoProps {
  isColored?: boolean;
}

export const Logo: FC<LogoProps> = ({ isColored }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      cursor: 'pointer',
      paddingTop: '48px',
      width: isColored ? '280px' : 'unset'
    }}
  >
    {isColored ? <ColoredLogo /> : <LargeLogo />}
  </Box>
);
