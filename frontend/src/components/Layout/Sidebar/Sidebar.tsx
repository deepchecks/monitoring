import React, { useContext, useRef, useState } from 'react';
import { AppBar, Box, useTheme } from '@mui/material';

import { GlobalStateContext } from 'helpers/context/GlobalProvider';
import { useScrollBar } from 'helpers/hooks/useScrollBar';
import { PathInfo } from '../../../helpers/routes';
import useWindowResize from '../../../helpers/hooks/windowResize';

import { AnalysisSubMenu } from './components/AnalysisSubMenu';
import { SidebarMenuItem } from './components/SidebarMenuItem';
import { UserInfo } from './components/UserInfo';
import { InviteMember } from 'components/WorkspaceSettings/components/Members/components/InviteMember';

import { StyledButton, StyledContainer, StyledLogo } from 'components/lib';

export const Sidebar = () => {
  const width = useWindowResize();
  const contentRef = useRef<HTMLElement>();

  const { palette } = useTheme();

  const [userInviteOpen, setUserInviteOpen] = useState(false);
  const [openAnalysisSubMenu, setOpenAnalysisSubMenu] = useState<boolean>(false);
  const style = useScrollBar(contentRef);

  const handleInviteToOrgClick = () => {
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
        width: '237px',
        height: '100vh',
        zIndex: 100,
        background: palette?.grey[200]
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
            background: palette?.grey[200]
          }}
        >
          <Box>
            <Box
              sx={{
                zIndex: 3,
                padding: '20px',
                position: 'sticky'
              }}
            >
              <StyledLogo withLabel margin="32px 0 0 0" />
            </Box>
            <Box sx={{ mt: '20px', padding: '0 6px' }}>
              {pathsInfo.map((info: PathInfo) =>
                info.ignoreLink ? (
                  <React.Fragment key={info.link}></React.Fragment>
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
              label="Invite Users"
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
