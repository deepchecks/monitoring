import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Box } from '@mui/system';
import { Menu } from '@mui/icons-material';
import { useMediaQuery } from '@mui/material';
import Drawer from '@mui/material/Drawer';

import useUser from 'helpers/hooks/useUser';

import { Sidebar } from 'components/Layout/Sidebar';
import { StyledContainer, StyledLogo } from 'components/lib';
import { theme } from 'components/lib/theme';

const Layout = () => {
  const { isUserDetailsComplete } = useUser();
  const [mobileBarOpen, setMobileBarOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  if (!isUserDetailsComplete) return null;

  const handleMobileMenuClick = () => setMobileBarOpen(!mobileBarOpen);

  return (
    <main>
      <Box
        sx={theme => ({
          [theme.breakpoints.up(1920)]: {
            borderRight: '1px solid rgba(209, 216, 220, 0.5)',
            borderLeft: '1px solid rgba(209, 216, 220, 0.5)',
            height: '100%'
          }
        })}
      >
        {isMobile ? (
          <Box>
            <StyledContainer
              type="bar"
              height="50px"
              width="100%"
              borderRadius={0}
              flexDirection="row"
              justifyContent="space-between"
            >
              <Menu onClick={handleMobileMenuClick} sx={{ margin: '2px' }} />
              <StyledLogo margin="-6px 0 0 0" />
              <Drawer open={mobileBarOpen} onClose={handleMobileMenuClick} onClick={handleMobileMenuClick}>
                <Sidebar />
              </Drawer>
            </StyledContainer>
            <StyledContainer padding="0 35px" width="100%" minHeight="100vh" type="bg" borderRadius={0}>
              <Outlet />
            </StyledContainer>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex'
            }}
          >
            <Sidebar />
            <StyledContainer padding="0 35px" width="calc(100% - 237px)" type="bg" borderRadius={0}>
              <Outlet />
            </StyledContainer>
          </Box>
        )}
      </Box>
    </main>
  );
};

export default Layout;
