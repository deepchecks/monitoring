import React, { ReactNode } from 'react';

import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';

import { hotjar } from 'react-hotjar';

import mixpanel from 'mixpanel-browser';

import * as Sentry from '@sentry/react';
import { CaptureConsole } from '@sentry/integrations';
import { BrowserTracing } from '@sentry/tracing';

import useConfig from './useConfig';

const AppInitialization = ({ children }: { children: ReactNode | ReactNode[] }) => {
  const envVariables = useConfig() as { [key: string]: string };

  if (envVariables) {
    // Sentry
    Sentry.init({
      dsn: envVariables.sentryDsn,
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
      environment: envVariables.enviroment,
      denyUrls: [new RegExp('https?://localhost*'), new RegExp('https?://127.0.0.1*')]
    });

    // HotJar
    const hotJarId = Number(envVariables.hotjar_sv);
    const hotJarSv = Number(envVariables.hotjar_id);

    if (hotJarSv && hotJarId) {
      hotjar.initialize(+hotJarId, +hotJarSv);
    }

    // MixPanel
    const mixpanelId = envVariables.mixpanel_id;

    if (mixpanelId) {
      mixpanel.init(mixpanelId, { ignore_dnt: true });
    }
  }

  return <>{children}</>;
};

export default AppInitialization;
