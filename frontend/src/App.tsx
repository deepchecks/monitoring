import React, { Suspense, lazy, ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';

import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import InitializationProvider from 'helpers/context/InitializationProvider';
import { GlobalStateProvider } from './helpers/context/GlobalProvider';
import { StatsTimeProvider } from './helpers/hooks/useStatsTime';
import { UserProvider } from './helpers/hooks/useUser';
import { lazyRetry, outLayoutRoutes, pathsInfo } from 'helpers/routes';

import { Loader } from 'components/base/Loader/Loader';
import { StyledThemeProvider } from 'components/lib';
import Layout from 'components/Layout/Layout';

import 'overlayscrollbars/overlayscrollbars.css';
import './components/lib/assets/css/fonts.css';

const NotFoundPage = lazy(() => lazyRetry(() => import('./pages/NotFoundPage')));

const LazyWrapper = ({ children }: { children: ReactNode }) => <Suspense fallback={<Loader />}>{children}</Suspense>;

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

const App = () => {
  const queryClient = new QueryClient();
  const flatPathsInfo = pathsInfo.flatMap(pathInfo => [pathInfo, ...(pathInfo?.children ?? [])]);

  return (
    <InitializationProvider>
      <BrowserRouter>
        <StyledThemeProvider>
          <Sentry.ErrorBoundary fallback={<NotFoundPage />}>
            <QueryClientProvider client={queryClient}>
              <CssBaseline />
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <GlobalStateProvider>
                  <UserProvider>
                    <StatsTimeProvider>
                      <SentryRoutes>
                        <Route element={<Layout />}>
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
                        {outLayoutRoutes.map(({ link, element: PageElement }) => (
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
                      </SentryRoutes>
                    </StatsTimeProvider>
                  </UserProvider>
                </GlobalStateProvider>
              </LocalizationProvider>
            </QueryClientProvider>
          </Sentry.ErrorBoundary>
        </StyledThemeProvider>
      </BrowserRouter>
    </InitializationProvider>
  );
};

export default Sentry.withProfiler(App);
