import React, { ReactNode } from 'react';
import { List, Paper } from '@mui/material';

interface SubmenuProps {
  children: ReactNode;
  position?: 'left' | 'right';
  open: boolean;
}

export const Submenu = ({ children, open, position = 'left' }: SubmenuProps) => {
  if (!open) {
    return null;
  }

  const style = position === 'left' ? { marginLeft: 'calc(-100% - 10px)' } : { marginleft: '10px' };

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 10,
        ...style
      }}
    >
      <List
        sx={{
          padding: '6px 0 10px'
        }}
      >
        {children}
      </List>
    </Paper>
  );
};
