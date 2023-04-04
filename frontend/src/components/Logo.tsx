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
      padding: { xs: '32px 20px 0', lg: '32px 20px 0', xl: '48px 0' },
      width: isColored ? '280px' : 'unset'
    }}
  >
    {isColored ? <ColoredLogo /> : <LargeLogo />}
  </Box>
);
