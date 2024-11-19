import React, { ReactNode, useEffect } from 'react';

import { datadogRum } from '@datadog/browser-rum';

import { hotjar } from 'react-hotjar';

import mixpanel from 'mixpanel-browser';

import useConfig from '../hooks/useConfig';

import { getStorageItem, storageKeys } from 'helpers/utils/localStorage';

const InitializationProvider = ({ children }: { children: ReactNode | ReactNode[] }) => {
  const { hotjar_sv, hotjar_id, data_dog_id, mixpanel_id, environment, datadog_fe_token } = useConfig() as {
    [key: string]: string;
  };

  // DataDog
  const dataDogId = data_dog_id;
  const isTrackable = `${process.env.REACT_APP_NODE_ENV}` === 'production';
  const userName = getStorageItem(storageKeys?.user)?.u_name ?? '';
  const userEmail = getStorageItem(storageKeys?.user)?.u_email ?? '';

  if (datadog_fe_token && dataDogId && isTrackable) {
    datadogRum.init({
      env: environment,
      trackResources: true,
      trackLongTasks: true,
      site: 'datadoghq.com',
      service: 'mon-client',
      applicationId: dataDogId,
      clientToken: datadog_fe_token,
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
