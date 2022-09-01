import React from 'react';
import { Box, AppBar } from '@mui/material';

import { sideBarInfo, SidebarInfo } from '../helpers/helper';
import useWindowResize from '../hooks/windowResize';
import { Logo } from './Logo';
import { SidebarMenuItem } from './SidebarMenuItem';

export const Sidebar = () => {
  const width = useWindowResize();

  return (
    <AppBar
      component="nav"
      position="sticky"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#17003E',
        width: '237px',
        height: '100vh'
      }}
    >
      <Box sx={{ width: 1 }}>
        <Logo width={width} onClick={() => undefined} />
        <Box sx={{ mt: '54px', pl: '14px' }}>
          {sideBarInfo &&
            sideBarInfo.map((info: SidebarInfo) => <SidebarMenuItem key={info.link} info={info} width={width} />)}
        </Box>
      </Box>
    </AppBar>
  );
};
