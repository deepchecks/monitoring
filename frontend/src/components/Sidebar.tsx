import React, { useState } from 'react';
import mixpanel from 'mixpanel-browser';

import useWindowResize from '../hooks/windowResize';

import { PathInfo, pathsInfo } from '../helpers/helper';

import { alpha, AppBar, Box, Button, styled, Typography } from '@mui/material';

import { Logo } from './Logo';
import { SidebarMenuItem } from './SidebarMenuItem';
import { UserInviteDialog } from './UserInviteDialog';
import { UserInfo } from './UserInfo';

import { UserInvite } from 'assets/icon/icon';
import { colors } from 'theme/colors';

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
    mixpanel.track('Click on the Invite to workspace');

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
        background: colors.primary.violet[600],
        width: '237px',
        height: '100vh'
      }}
    >
      <Box
        sx={{
          height: 1,
          width: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <Box>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 3,
              background: colors.primary.violet[600],
              paddingBottom: '20px'
            }}
          >
            <Logo />
          </Box>

          <Box sx={{ mt: '40px', pl: '14px' }}>
            {pathsInfo.map((info: PathInfo) => (
              <SidebarMenuItem key={info.link} info={info} width={width} />
            ))}
          </Box>
        </Box>

        <Box sx={{ padding: '50px 30px 90px' }}>
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
