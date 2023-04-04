import React from 'react';

import Button, { ButtonProps } from '@mui/material/Button';

interface MUIBaseButtonProps extends ButtonProps {
  children: React.ReactNode;
}

export const MUIBaseButton = ({ children, sx, ...props }: MUIBaseButtonProps) => (
  <Button
    sx={{
      fontWeight: 600,
      borderRadius: '5px',
      ...sx
    }}
    {...props}
  >
    {children}
  </Button>
);
