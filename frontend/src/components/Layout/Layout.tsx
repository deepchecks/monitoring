import React from 'react';
import { Outlet } from 'react-router-dom';

import { Box } from '@mui/system';

import { Sidebar } from 'components/Layout/Sidebar';
import useUser from 'helpers/hooks/useUser';
import { StyledContainer } from 'components/lib';

const Layout = () => {
  const { isUserDetailsComplete } = useUser();
  if (!isUserDetailsComplete) return null;

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
        <Box
          sx={{
            display: 'flex'
          }}
        >
          <Sidebar />
          <StyledContainer
            sx={{
              padding: { xs: '0 30px', lg: '0 30px', xl: '0 35px' },
              width: { xs: 'calc(100% - 196px)', lg: 'calc(100% - 196px)', xl: 'calc(100% - 237px)' }
            }}
            type="bg"
          >
            <Outlet />
          </StyledContainer>
        </Box>
      </Box>
    </main>
  );
};

export default Layout;
