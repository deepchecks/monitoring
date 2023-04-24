import React, { ReactNode, useEffect } from 'react';

import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';

import { hotjar } from 'react-hotjar';

import mixpanel from 'mixpanel-browser';

import * as Sentry from '@sentry/react';
import { CaptureConsole } from '@sentry/integrations';
import { BrowserTracing } from '@sentry/tracing';

import useConfig from '../hooks/useConfig';

const InitializationProvider = ({ children }: { children: ReactNode | ReactNode[] }) => {
  const { hotjar_sv, hotjar_id, sentryDsn, enviroment, mixpanel_id } = useConfig() as { [key: string]: string };

  // HotJar
  const hotJarId = Number(hotjar_sv);
  const hotJarSv = Number(hotjar_id);

  useEffect(() => {
    if (hotJarSv && hotJarId) {
      hotjar.initialize(+hotJarId, +hotJarSv);
    }
  }, [hotJarId, hotJarSv]);

  // Sentry
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
    environment: enviroment,
    denyUrls: [new RegExp('https?://localhost*'), new RegExp('https?://127.0.0.1*')]
  });

  // MixPanel
  const mixpanelId = mixpanel_id;

  if (mixpanelId) {
    mixpanel.init(mixpanelId, { ignore_dnt: true });
  }

  return <>{children}</>;
};

export default InitializationProvider;
