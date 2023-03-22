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

import { SidebarInviteButton } from './Sidebar.styles';

import { Logo } from '../../Logo';

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
        background: '#17003E',
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
            background: '#17003E'
          }}
        >
          <Box>
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 3,
                background: '#17003E',
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

          <Box sx={{ padding: '30px 20px' }}>
            <UserInfo />
            <SidebarInviteButton onClick={handleInviteToOrgClick}>Invite members</SidebarInviteButton>
          </Box>
        </Box>
      </Box>
      <AnalysisSubMenu open={openAnalysisSubMenu} onClose={closeAnalysisSubMenu} />
      <InviteMember open={userInviteOpen} closeDialog={handleInviteToOrgClose} />
    </AppBar>
  );
};
