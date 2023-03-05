import React, { ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import { hotjar } from 'react-hotjar';
import mixpanel from 'mixpanel-browser';
import * as Sentry from '@sentry/react';
import { CaptureConsole } from '@sentry/integrations';
import { BrowserTracing } from '@sentry/tracing';

import logger from 'helpers/services/logger';
import { customInstance } from 'helpers/services/customAxios';

const AppInitializationProvider = ({ children }: { children: ReactNode | ReactNode[] }) => {
  const [envVariables, setEnvVariables] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    async () => {
      try {
        const res = (await customInstance({
          method: 'GET',
          url: '/api/v1/configuration'
        })) as { [key: string]: string };

        setEnvVariables(res);
      } catch (err) {
        logger.error('error on ap initialization', err);
      }
    };
  }, []);

  const sentryEnv = envVariables.enviroment ?? process.env.REACT_APP_SENTRY_ENV;
  const sentryDsn = envVariables.sentryDsn ?? process.env.REACT_APP_SENTRY_DSN;
  const hotjarId = process.env.REACT_APP_HJ_ID;
  const hotjarSv = process.env.REACT_APP_HJ_SV;
  const mixpanelId = envVariables.mixpanel_id ?? process.env.REACT_APP_MIXPANEL_ID;

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
        levels: ['warn', 'error', 'info']
      })
    ],
    tracesSampleRate: 1,
    environment: sentryEnv,
    denyUrls: [new RegExp('https?://localhost*'), new RegExp('https?://127.0.0.1*')]
  });

  if (hotjarId && hotjarSv) {
    hotjar.initialize(+hotjarId, +hotjarSv);
  }

  if (mixpanelId) {
    mixpanel.init(mixpanelId, { ignore_dnt: true });
  }

  return <>{children}</>;
};

export default AppInitializationProvider;
