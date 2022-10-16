import { alpha, AppBar, Box, Button, styled, Typography } from '@mui/material';
import { UserInvite } from 'assets/icon/icon';
import { useScrollBar } from 'hooks/useScrollBar';
import mixpanel from 'mixpanel-browser';
import React, { useRef, useState } from 'react';
import { colors } from 'theme/colors';
import { PathInfo, pathsInfo } from '../helpers/helper';
import useWindowResize from '../hooks/windowResize';
import { AnalysisSubMenu } from './AnalysisSubMenu';
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
  const contentRef = useRef<HTMLElement>();

  const [userInviteOpen, setUserInviteOpen] = useState(false);
  const [openAnalysisSubMenu, setOpenAnalysisSubMenu] = useState<boolean>(false);
  const style = useScrollBar(contentRef);

  const handleInviteToOrgClick = () => {
    mixpanel.track('Click on the Invite to workspace');

    setUserInviteOpen(true);
  };

  const handleInviteToOrgClose = () => {
    setUserInviteOpen(false);
  };

  const handleOpenAnalysisSubMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setOpenAnalysisSubMenu(prevState => !prevState);
  };

  const closeAnalysisSubMenu = () => {
    setOpenAnalysisSubMenu(false);
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
        height: '100vh',
        zIndex: 100
      }}
    >
      <Box ref={contentRef} sx={{ height: 1, width: 1, overflow: 'auto', ...style }}>
        <Box
          sx={{
            height: 1,
            width: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 10,
            background: colors.primary.violet[600]
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
                <SidebarMenuItem key={info.link} onOpenSumMenu={handleOpenAnalysisSubMenu} info={info} width={width} />
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
      </Box>

      <AnalysisSubMenu open={openAnalysisSubMenu} onClose={closeAnalysisSubMenu} />
      <UserInviteDialog open={userInviteOpen} onClose={handleInviteToOrgClose}></UserInviteDialog>
    </AppBar>
  );
};
