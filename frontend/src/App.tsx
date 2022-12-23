import React from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { GlobalStateProvider } from './context';
import { StatsTimeProvider } from './hooks/useStatsTime';
import useUser, { UserProvider } from './hooks/useUser';

import { Box, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { pathsInfo } from 'helpers/helper';
import { BACKGROUND_COLOR_MAX_WIDTH } from './helpers/variables/colors';

import { DashboardPage } from 'pages/DashboardPage';
import { CompleteDetails } from './pages/CompleteDetails';
import { Sidebar } from './components/Sidebar';

import 'overlayscrollbars/overlayscrollbars.css';
import { LicenseAgreementPage } from 'pages/LicenseAgreement';

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
          <Box
            sx={{
              background: BACKGROUND_COLOR_MAX_WIDTH,
              padding: '0 35px',
              minWidth: '1200px',
              width: '100%'
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </main>
  );
};

const App = () => {
  const queryClient = new QueryClient();
  const flatPathsInfo = pathsInfo.flatMap(pathInfo => [pathInfo, ...(pathInfo?.children ?? [])]);

  return (
    <QueryClientProvider client={queryClient}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <GlobalStateProvider>
          <UserProvider>
            <StatsTimeProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<DashboardPage />} />
                  {flatPathsInfo.map(({ link, element: PageElement }) => (
                    <Route key={link} path={link} element={<PageElement />} />
                  ))}
                </Route>
                <Route path="/complete-details" element={<CompleteDetails />} />
                <Route path="/license-agreement" element={<LicenseAgreementPage />} />
              </Routes>
            </StatsTimeProvider>
          </UserProvider>
        </GlobalStateProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
};

export default App;
