import React, { Suspense, lazy, ReactNode } from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';

import { GlobalStateProvider } from './context';
import { StatsTimeProvider } from './hooks/useStatsTime';
import useUser, { UserProvider } from './hooks/useUser';

import { Box, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { Sidebar } from './components/Sidebar';
import { Loader } from 'components/Loader';

import { lazyRetry, pathsInfo } from 'helpers/helper';
import { BACKGROUND_COLOR_MAX_WIDTH } from './helpers/variables/colors';

import 'overlayscrollbars/overlayscrollbars.css';

const DashboardPage = lazy(() => lazyRetry(() => import('./pages/DashboardPage')));
const CompleteDetails = lazy(() => lazyRetry(() => import('./pages/CompleteDetails')));
const LicenseAgreementPage = lazy(() => lazyRetry(() => import('./pages/LicenseAgreement')));

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
              padding: { xs: '0 30px', lg: '0 30px', xl: '0 35px' },
              width: { xs: 'calc(100% - 196px)', lg: 'calc(100% - 196px)', xl: 'calc(100% - 237px)' }
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </main>
  );
};

const LazyWrapper = ({ children }: { children: ReactNode }) => <Suspense fallback={<Loader />}>{children}</Suspense>;

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

const App = () => {
  const queryClient = new QueryClient();
  const flatPathsInfo = pathsInfo.flatMap(pathInfo => [pathInfo, ...(pathInfo?.children ?? [])]);

  return (
    <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>
      <QueryClientProvider client={queryClient}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <GlobalStateProvider>
            <UserProvider>
              <StatsTimeProvider>
                <SentryRoutes>
                  <Route element={<Layout />}>
                    <Route
                      path="/"
                      element={
                        <LazyWrapper>
                          <DashboardPage />
                        </LazyWrapper>
                      }
                    />
                    {flatPathsInfo.map(({ link, element: PageElement }) => (
                      <Route
                        key={link}
                        path={link}
                        element={
                          <LazyWrapper>
                            <PageElement />
                          </LazyWrapper>
                        }
                      />
                    ))}
                  </Route>
                  <Route
                    path="/complete-details"
                    element={
                      <LazyWrapper>
                        <CompleteDetails />
                      </LazyWrapper>
                    }
                  />
                  <Route
                    path="/license-agreement"
                    element={
                      <LazyWrapper>
                        <LicenseAgreementPage />
                      </LazyWrapper>
                    }
                  />
                </SentryRoutes>
              </StatsTimeProvider>
            </UserProvider>
          </GlobalStateProvider>
        </LocalizationProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
};

export default Sentry.withProfiler(App);
