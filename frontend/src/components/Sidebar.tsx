import { alpha, AppBar, Box, Button, styled, Typography } from '@mui/material';
import { UserInvite } from 'assets/icon/icon';
import React, { useState } from 'react';
import { PathInfo, pathsInfo } from '../helpers/helper';
import useWindowResize from '../hooks/windowResize';
import { Logo } from './Logo';
import { SidebarMenuItem } from './SidebarMenuItem';
import { UserInfo } from './UserInfo';
import { UserInviteDialog } from './UserInviteDialog';

const StyledButton = styled(Button)(({ theme }) => ({
  width: '100%',
  background: 'none',
  borderRadius: 2,
  border: `1px solid ${alpha(theme.palette.common.white, 0.4)}}`,
  padding: '12px 11px',
  '& .MuiButton-startIcon.MuiButton-iconSizeMedium': {
    marginRight: '12px'
  }
}));

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
      <Box sx={{ height: 1, width: 1, overflow: 'auto' }}>
        <Box sx={{ width: 1, height: 0.7 }}>
          <Box sx={{ position: 'sticky', top: 0 }}>
            <Logo />
          </Box>

          <Box sx={{ mt: '60px', pl: '14px' }}>
            {pathsInfo.map((info: PathInfo) => (
              <SidebarMenuItem key={info.link} info={info} width={width} />
            ))}
          </Box>
        </Box>

        <Box sx={{ width: 1, height: 0.3, padding: '0 30px' }}>
          <StyledButton onClick={handleInviteToOrgClick} startIcon={<UserInvite />}>
            <Typography
              sx={{
                textTransform: 'none',
                fontSize: 12,
                lineHeight: '140%',
                letterSpacing: '0.1px',
                color: theme => theme.palette.common.white
              }}
            >
              Invite to workspace
            </Typography>
          </StyledButton>
          <UserInfo />
        </Box>
      </Box>
      <UserInviteDialog open={userInviteOpen} onClose={handleInviteToOrgClose}></UserInviteDialog>
    </AppBar>
  );
};
