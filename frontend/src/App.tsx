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
import { AlertsPage } from './pages/AlertsPage';
import { StatsTimeProvider } from './hooks/useStatsTime';
import useUser, { UserProvider } from './hooks/useUser';

const Layout = () => {
  const { isUserDetailsComplete } = useUser();
  if (!isUserDetailsComplete) return null;

  return (
    <div>
      <main>
        <Box
          sx={theme => ({
            margin: '0 auto',
            background: BACKGROUND_COLOR_MAX_WIDTH,
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
                width: '100%',
                padding: '0 35px'
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
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/analysis" element={<div>analysis placeholder...</div>} />
                  <Route path="/configuration" element={<DashboardPage />} />
                </Route>
                <Route path="/complete-details" element={<CompleteDetails />} />
              </Routes>
            </StatsTimeProvider>
          </UserProvider>
        </GlobalStateProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
};

export default App;
