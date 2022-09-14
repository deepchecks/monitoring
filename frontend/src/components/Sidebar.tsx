import React, { useState } from 'react';
import { Box, AppBar, Button, Container } from '@mui/material';
import { sideBarInfo, SidebarInfo } from '../helpers/helper';
import useWindowResize from '../hooks/windowResize';
import { Logo } from './Logo';
import { SidebarMenuItem } from './SidebarMenuItem';
import { UserInvite } from 'assets/icon/icon';
import { UserInviteDialog } from './UserInviteDialog';
import { UserInfo } from './UserInfo';

export const Sidebar = () => {
  const width = useWindowResize();

  const [userInviteOpen, setUserInviteOpen] = useState(false);

  const handleInviteToOrgClick = () => {
    setUserInviteOpen(true);
  };

  const handleInviteToOrgClose = () => {
    setUserInviteOpen(false);
  };

  return (
    <AppBar
      component="nav"
      position="sticky"
      sx={{
        left: 0,
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#17003E',
        width: '237px',
        height: '100vh'
      }}
    >
      <Container sx={{ height: 1 }}>
        <Box sx={{ width: 1, height: 0.7 }}>
          <Logo />
          <Box sx={{ mt: '54px', pl: '14px' }}>
            {sideBarInfo &&
              sideBarInfo.map((info: SidebarInfo) => <SidebarMenuItem key={info.link} info={info} width={width} />)}
          </Box>
        </Box>

        <Box sx={{ width: 1, height: 0.3 }}>
          <Button sx={{ width: 1, background: 'none', border: 1, borderRadius: 2 }} onClick={handleInviteToOrgClick}>
            <UserInvite></UserInvite> Invite to workspace
          </Button>
          <UserInfo />
        </Box>
      </Container>
      <UserInviteDialog open={userInviteOpen} onClose={handleInviteToOrgClose}></UserInviteDialog>
    </AppBar>
  );
};
