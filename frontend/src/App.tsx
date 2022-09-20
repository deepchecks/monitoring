import { Box, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Outlet, Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { GlobalStateProvider } from './Context';
import { BACKGROUND_COLOR_MAX_WIDTH } from './helpers/variables/colors';
import { StatsTimeProvider } from './hooks/useStatsTime';
import useUser, { UserProvider } from './hooks/useUser';
import { HeaderProvider } from 'hooks/useHeader';
import { pathsInfo } from 'helpers/helper';
import { MonitorsDataProvider } from './hooks/useMonitorsData';
import { CompleteDetails } from './pages/CompleteDetails';
import { DashboardPage } from 'pages/DashboardPage';

const Layout = () => {
  const { isUserDetailsComplete } = useUser();
  if (!isUserDetailsComplete) return null;

  return (
    <MonitorsDataProvider>
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
    </MonitorsDataProvider>
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
                
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<DashboardPage />} />
                    {flatPathsInfo.map(({ link, element: PageElement }) => (
                      <Route key={link} path={link} element={<PageElement />} />
                    ))}
                  </Route>
                  <Route path="/complete-details" element={<CompleteDetails />} />
                </Routes>
              </StatsTimeProvider>
            </HeaderProvider>
          </UserProvider>
        </GlobalStateProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
};

export default App;
