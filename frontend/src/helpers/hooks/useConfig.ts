import { useEffect, useState } from 'react';

import { storageKeys } from 'helpers/utils/localStorage';

import { applicationConfigurationsApiV1ConfigurationsGet } from 'api/generated';

import { resError } from 'helpers/types/resError';

const initialVars = {
  sentryDsn: `${process.env.REACT_APP_SENTRY_DSN}`,
  environment: `${process.env.REACT_APP_BASE_API}`,
  mixpanel_id: `${process.env.REACT_APP_MIXPANEL_ID}`
};

const useConfig = () => {
  const [envVariables, setEnvVariables] = useState<{ [key: string]: string | boolean }>(initialVars);

  const getConfiguration = async () => {
    const res = (await applicationConfigurationsApiV1ConfigurationsGet()) as unknown;

    if (res && !(res as unknown as resError).error_message) {
      setEnvVariables(res as { [key: string]: string | boolean });
    }
  };

  const initialize = window.location.pathname.includes('complete-details');

  useEffect(() => {
    !initialize && void getConfiguration();
  }, []);

  localStorage.setItem(storageKeys.environment, JSON.stringify(envVariables));

  return envVariables;
};

export default useConfig;
