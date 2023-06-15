import React, { PropsWithChildren } from 'react';

import { Drawer, DrawerProps, styled } from '@mui/material';

import { Loader } from 'components/base/Loader/Loader';

interface CustomDrawerProps extends DrawerProps {
  loading?: boolean;
  padding?: string;
}

export const CustomDrawer = ({ loading, children, ...props }: PropsWithChildren<CustomDrawerProps>) => (
  <StyledDrawer anchor="right" {...props}>
    {loading ? <Loader /> : children}
  </StyledDrawer>
);

interface StyledDrawerProps {
  padding?: string;
}

export const StyledDrawer = styled(Drawer, { shouldForwardProp: prop => prop !== 'padding' })<StyledDrawerProps>(
  ({ padding }) => ({
    '& .MuiPaper-root': {
      width: 1090,
      height: '100%',
      padding,

      '@media (max-width: 1090px)': {
        width: '100vw'
      }
    }
  })
);
