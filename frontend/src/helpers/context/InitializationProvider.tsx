import React, { ReactNode, useEffect } from 'react';

import { datadogRum } from '@datadog/browser-rum';

import { hotjar } from 'react-hotjar';

import mixpanel from 'mixpanel-browser';

import useConfig from '../hooks/useConfig';

import { getStorageItem, storageKeys } from 'helpers/utils/localStorage';

const InitializationProvider = ({ children }: { children: ReactNode | ReactNode[] }) => {
  const { hotjar_sv, hotjar_id, data_dog_id, data_dog_token, mixpanel_id, environment } = useConfig() as {
    [key: string]: string;
  };

  // DataDog
  const dataDogId = data_dog_id;
  const dataDogToken = data_dog_token;
  const userName = getStorageItem(storageKeys?.user)?.u_name ?? '';
  const userEmail = getStorageItem(storageKeys?.user)?.u_email ?? '';

  if (dataDogToken && dataDogId) {
    datadogRum.init({
      env: environment,
      trackResources: true,
      trackLongTasks: true,
      site: 'datadoghq.com',
      service: 'mon-client',
      applicationId: dataDogId,
      clientToken: dataDogToken,
      trackUserInteractions: true,
      defaultPrivacyLevel: 'allow',
      sessionReplaySampleRate: 100,
      startSessionReplayRecordingManually: true
    });

    datadogRum?.setUser({ name: userName, email: userEmail });
    datadogRum?.startSessionReplayRecording();
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
