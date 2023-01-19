import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import { hotjar } from 'react-hotjar';
import mixpanel from 'mixpanel-browser';
import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';
import * as Sentry from '@sentry/react';
import { CaptureConsole } from '@sentry/integrations';
import { BrowserTracing } from '@sentry/tracing';

import { ThemeProvider } from '@mui/material';
import { theme } from './theme';

import App from './App';

const sentryEnv = process.env.REACT_APP_SENTRY_ENV;
const sentryDsn = process.env.REACT_APP_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  integrations: [
    new BrowserTracing({
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(
        React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes
      )
    }),
    new CaptureConsole({
      levels: ['warn', 'error']
    })
  ],
  tracesSampleRate: 1,
  environment: sentryEnv,
  denyUrls: ["https://localhost:3000"]
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
const hotjarId = process.env.REACT_APP_HJ_ID;
const hotjarSv = process.env.REACT_APP_HJ_SV;
const mixpanelId = process.env.REACT_APP_MIXPANEL_ID;

if (hotjarId && hotjarSv) {
  hotjar.initialize(+hotjarId, +hotjarSv);
}

if (mixpanelId) {
  mixpanel.init(mixpanelId, { ignore_dnt: true });
}

(async () => {
  const LDProvider = await asyncWithLDProvider({
    clientSideID: process.env.REACT_APP_LD_CLIENT_SIDE_ID ? process.env.REACT_APP_LD_CLIENT_SIDE_ID : '',
    user: {
      key: 'noauthkey',
      name: 'Unauthorized User',
      email: 'unauthorized@unauth.com'
    },
    options: {
      /* ... */
    }
  });

  root.render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <LDProvider>
          <App />
        </LDProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
})();
