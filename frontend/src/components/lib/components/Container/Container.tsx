import React, { ReactNode, forwardRef } from 'react';
import { Box, BoxProps, useTheme } from '@mui/material';

export interface ContainerProps extends BoxProps {
  type?: 'card' | 'bar' | 'bg';
  children?: ReactNode | ReactNode[];
  background?: string;
}

export const Container = forwardRef((props: ContainerProps, ref) => {
  const {
    children,
    type,
    background = 'transparent',
    display = 'flex',
    flexDirection = 'column',
    padding = '12px',
    width = '100%',
    gap = '8px',
    borderRadius = '12px',
    boxShadow = 'none',
    ...otherProps
  } = props;

  const theme = useTheme();

  const bgToUse = () => {
    switch (type) {
      case 'bg':
        return theme.palette.grey[100];
      case 'bar':
        return theme.palette.grey[200];
      case 'card':
        return theme.palette.common.white;
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
      boxShadow={type === 'card' ? `0 0 5px 0 ${theme.palette.grey[200]}` : boxShadow}
      sx={{ background: bgToUse() }}
      ref={ref}
      {...otherProps}
    >
      {children}
    </Box>
  );
});

Container.displayName = 'Container';
