import React from 'react';
import { Outlet, Routes, Route } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Sidebar } from './components/Sidebar';
import { CompleteDetails } from './pages/CompleteDetails';
import { BACKGROUND_COLOR_MAX_WIDTH } from './helpers/variables/colors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalStateProvider } from './Context';
import { DashboardPage } from './pages/DashboardPage';
import { StatsTimeProvider } from './hooks/useStatsTime';
import useUser, { UserProvider } from './hooks/useUser';
import { HeaderProvider } from 'hooks/useHeader';
import { pathsInfo } from 'helpers/helper';
import { MonitorsDataProvider } from './hooks/useMonitorsData';

const Layout = () => {
  const { isUserDetailsComplete } = useUser();
  if (!isUserDetailsComplete) return null;

  return (
    <div>
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
    </div>
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
            <HeaderProvider>
              <StatsTimeProvider>
                <MonitorsDataProvider>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<DashboardPage />} />
                    {flatPathsInfo.map(({ link, element: PageElement }) => (
                      <Route key={link} path={link} element={<PageElement />} />
                    ))}
                  </Route>
                  <Route path="/complete-details" element={<CompleteDetails />} />
                </Routes></MonitorsDataProvider>
              </StatsTimeProvider>
            </HeaderProvider>
          </UserProvider>
        </GlobalStateProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
};

export default App;
