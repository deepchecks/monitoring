import React, { ReactNode } from 'react';
import { Box, BoxProps, useTheme } from '@mui/material';

import { isDarkMode } from '../../theme/darkMode.helpers';

export interface ContainerProps extends BoxProps {
  type?: 'card' | 'bar' | 'bg';
  children?: ReactNode | ReactNode[];
  background?: string;
}

export const Container = (props: ContainerProps) => {
  const {
    children,
    type,
    background = 'transparent',
    display = 'flex',
    flexDirection = 'column',
    padding = '12px',
    width = '100%',
    gap = '8px',
    borderRadius = '12px'
  } = props;

  const theme = useTheme();

  const bgToUse = () => {
    switch (type) {
      case 'bg':
        return isDarkMode ? theme.palette.grey[800] : theme.palette.grey[100];
      case 'bar':
        return isDarkMode ? theme.palette.grey[700] : theme.palette.grey[200];
      case 'card':
        return isDarkMode ? theme.palette.common.black : theme.palette.common.white;
      default:
        return background;
    }
  };

  return (
    <Box
      display={display}
      flexDirection={flexDirection}
      padding={padding}
      width={width}
      gap={gap}
      borderRadius={borderRadius}
      sx={{ background: bgToUse() }}
      {...props}
    >
      {children}
    </Box>
  );
};
