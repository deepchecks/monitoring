import { alpha, AppBar, Box, Button, styled, Typography } from '@mui/material';
import { UserInvite } from 'assets/icon/icon';
import { GlobalStateContext } from 'helpers/context';
import { useScrollBar } from 'helpers/hooks/useScrollBar';
import React, { useContext, useRef, useState } from 'react';
import { colors } from 'theme/colors';
import { PathInfo } from '../../helpers/helper';
import { events, reportEvent } from 'helpers/services/mixPanel';
import useWindowResize from '../../helpers/hooks/windowResize';
import { AnalysisSubMenu } from './components/AnalysisSubMenu';
import { Logo } from '../Logo';
import { SidebarMenuItem } from './components/SidebarMenuItem';
import { UserInfo } from './components/UserInfo';
import { UserInviteDialog } from './components/UserInviteDialog';

const StyledButton = styled(Button)(({ theme }) => ({
  width: '100%',
  background: 'none',
  borderRadius: 2,
  border: `1px solid ${alpha(theme.palette.common.white, 0.4)}}`,
  '& .MuiButton-startIcon.MuiButton-iconSizeLarge': {
    marginRight: '8px'
  }
}));

export const Sidebar = () => {
  const width = useWindowResize();
  const contentRef = useRef<HTMLElement>();

  const [userInviteOpen, setUserInviteOpen] = useState(false);
  const [openAnalysisSubMenu, setOpenAnalysisSubMenu] = useState<boolean>(false);
  const style = useScrollBar(contentRef);

  const handleInviteToOrgClick = () => {
    reportEvent(events.sidebar.clickedInviteWorkspace);

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

  const { pathsInfo } = useContext(GlobalStateContext);

  return (
    <AppBar
      component="nav"
      position="sticky"
      sx={{
        left: 0,
        alignItems: 'center',
        justifyContent: 'space-between',
        background: colors.primary.violet[600],
        width: { xs: '196px', lg: '196px', xl: '237px' },
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

            <Box sx={{ mt: '40px', pl: { xs: '11px', lg: '11px', xl: '14px' } }}>
              {pathsInfo.map((info: PathInfo) =>
                info.ignoreLink ? (
                  <></>
                ) : (
                  <SidebarMenuItem
                    key={info.link}
                    onOpenSubMenu={handleOpenAnalysisSubMenu}
                    info={info}
                    width={width}
                  />
                )
              )}
            </Box>
          </Box>

          <Box sx={{ padding: { xs: '23px 20px', lg: '23px 20px', xl: '50px 30px' } }}>
            <StyledButton onClick={handleInviteToOrgClick} startIcon={<UserInvite />}>
              <Typography
                sx={{
                  textTransform: 'none',
                  fontSize: 12,
                  lineHeight: '42px',
                  letterSpacing: '0.1px',
                  color: theme => theme.palette.common.white,
                  height: '44px',

                  '@media (max-width: 1536px)': {
                    fontSize: 10
                  }
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
