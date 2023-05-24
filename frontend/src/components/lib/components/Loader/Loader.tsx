import React from 'react';

import { SxProps } from '@mui/system';

import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export type LoaderProps = {
  sx?: SxProps;
};

export const Loader = ({ sx }: LoaderProps) => (
  <Box
    sx={{
      width: 50,
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      margin: '0 auto',
      ...sx
    }}
  >
    <CircularProgress />
  </Box>
);
