import React, { ReactNode, useEffect } from 'react';

import { hotjar } from 'react-hotjar';

import mixpanel from 'mixpanel-browser';

import useConfig from '../hooks/useConfig';

const InitializationProvider = ({ children }: { children: ReactNode | ReactNode[] }) => {
  const { hotjar_sv, hotjar_id, mixpanel_id } = useConfig() as { [key: string]: string };

  // HotJar
  const hotJarId = Number(hotjar_sv);
  const hotJarSv = Number(hotjar_id);

  useEffect(() => {
    if (hotJarSv && hotJarId) {
      hotjar.initialize(+hotJarId, +hotJarSv);
    }
  }, [hotJarId, hotJarSv]);

  // MixPanel
  const mixpanelId = mixpanel_id;

  if (mixpanelId) {
    mixpanel.init(mixpanelId, { ignore_dnt: true });
  }

  return <>{children}</>;
};

export default InitializationProvider;
