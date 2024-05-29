import React, { ReactNode, useEffect } from 'react';

import { datadogRum } from '@datadog/browser-rum';

import { hotjar } from 'react-hotjar';

import mixpanel from 'mixpanel-browser';

import useConfig from '../hooks/useConfig';

const InitializationProvider = ({ children }: { children: ReactNode | ReactNode[] }) => {
  const { hotjar_sv, hotjar_id, data_dog_id, data_dog_token, mixpanel_id } = useConfig() as { [key: string]: string };

  // DataDog
  const isTrackable = true;

  if (data_dog_token && data_dog_id && isTrackable) {
    datadogRum.init({
      trackResources: true,
      trackLongTasks: true,
      site: 'datadoghq.com',
      service: 'mon-client',
      applicationId: data_dog_id,
      clientToken: data_dog_token,
      trackUserInteractions: true,
      defaultPrivacyLevel: 'allow',
      sessionReplaySampleRate: 100,
      startSessionReplayRecordingManually: true,
      version: 'N/A'
    });
  }

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
