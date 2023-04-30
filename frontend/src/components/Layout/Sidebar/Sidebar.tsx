import React, { useContext, useRef, useState } from 'react';
import { AppBar, Box } from '@mui/material';

import { GlobalStateContext } from 'helpers/context/GlobalProvider';
import { useScrollBar } from 'helpers/hooks/useScrollBar';
import { PathInfo } from '../../../helpers/helper';
import { events, reportEvent } from 'helpers/services/mixPanel';
import useWindowResize from '../../../helpers/hooks/windowResize';

import { AnalysisSubMenu } from './components/AnalysisSubMenu';
import { SidebarMenuItem } from './components/SidebarMenuItem';
import { UserInfo } from './components/UserInfo';
import { InviteMember } from 'components/WorkspaceSettings/Members/components/InviteMember';

import { StyledButton, StyledContainer, StyledLogo } from 'components/lib';

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
        width: { xs: '196px', lg: '196px', xl: '237px' },
        height: '100vh',
        zIndex: 100,
        background: '#D8DDE1'
      }}
    >
      <StyledContainer
        ref={contentRef}
        sx={{ height: 1, width: 1, overflow: 'auto', ...style, padding: 0, borderRadius: 0 }}
      >
        <Box
          sx={{
            height: 1,
            width: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 10,
            background: '#D8DDE1'
          }}
        >
          <Box>
            <Box
              sx={{
                position: 'sticky',
                zIndex: 3,
                padding: { xs: '26px 12px', lg: '26px 12px', xl: '26px' }
              }}
            >
              <StyledLogo withLabel />
            </Box>
            <Box sx={{ mt: '40px', pl: { xs: 0, lg: 0, xl: '14px' } }}>
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
          <Box sx={{ padding: '30px 20px' }}>
            <UserInfo />
            <StyledButton
              onClick={handleInviteToOrgClick}
              variant="outlined"
              label="Invite members"
              margin="0 auto"
              width="100%"
            />
          </Box>
        </Box>
      </StyledContainer>
      <AnalysisSubMenu open={openAnalysisSubMenu} onClose={closeAnalysisSubMenu} />
      <InviteMember open={userInviteOpen} closeDialog={handleInviteToOrgClose} />
    </AppBar>
  );
};
