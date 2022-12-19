import React, { PropsWithChildren } from 'react';

import { Drawer, DrawerProps, styled } from '@mui/material';

import { Loader } from './Loader';

interface CustomDrawerProps extends DrawerProps {
  loading: boolean;
}

export const CustomDrawer = ({ loading, children, ...props }: PropsWithChildren<CustomDrawerProps>) => (
  <StyledDrawer anchor="right" {...props}>
    {loading ? <Loader /> : children}
  </StyledDrawer>
);

const StyledDrawer = styled(Drawer)({
  '& .MuiPaper-root': {
    width: 1090,
    height: '100%'
  }
});
