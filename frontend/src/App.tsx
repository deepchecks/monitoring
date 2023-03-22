import React, { Suspense, lazy, ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';

import { CssBaseline, ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import AppInitialization from 'helpers/hooks/AppInitialization';
import { GlobalStateProvider } from './helpers/context/GlobalProvider';
import { StatsTimeProvider } from './helpers/hooks/useStatsTime';
import { UserProvider } from './helpers/hooks/useUser';

import { Loader } from 'components/Loader';
import Layout from 'components/Layout/Layout';

import 'overlayscrollbars/overlayscrollbars.css';

import { lazyRetry, pathsInfo } from 'helpers/helper';

import { theme } from 'theme';

const DashboardPage = lazy(() => lazyRetry(() => import('./pages/DashboardPage')));
const CompleteDetails = lazy(() => lazyRetry(() => import('./pages/CompleteDetails')));
const LicenseAgreementPage = lazy(() => lazyRetry(() => import('./pages/LicenseAgreement')));

const LazyWrapper = ({ children }: { children: ReactNode }) => <Suspense fallback={<Loader />}>{children}</Suspense>;

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

const App = () => {
  const queryClient = new QueryClient();
  const flatPathsInfo = pathsInfo.flatMap(pathInfo => [pathInfo, ...(pathInfo?.children ?? [])]);

  return (
    <AppInitialization>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
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
        </ThemeProvider>
      </BrowserRouter>
    </AppInitialization>
  );
};

export default Sentry.withProfiler(App);
