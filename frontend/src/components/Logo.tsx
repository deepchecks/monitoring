import React, { FC } from 'react';
import { Box } from '@mui/material';
import { Logo as LargeLogo, Logoin1280 as MediumLogo } from '../assets/logo';

interface LogoProps {
  onClick: () => void;
  width: number;
}

export const Logo: FC<LogoProps> = ({ onClick, width }) => (
  <Box
    onClick={() => {
      onClick();
    }}
    sx={{
      display: 'flex',
      justifyContent: 'center',
      paddingTop: '40px',
      cursor: 'pointer'
    }}
  >
    {width > 1381 ? <LargeLogo /> : <MediumLogo />}
  </Box>
);
