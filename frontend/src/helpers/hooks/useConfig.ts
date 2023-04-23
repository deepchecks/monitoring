import { useEffect, useState } from 'react';

import logger from 'helpers/services/logger';

import { applicationConfigurationsApiV1ConfigurationsGet } from 'api/generated';

const initialVars = {
  sentryDsn: `${process.env.REACT_APP_SENTRY_DSN}`,
  environment: `${process.env.REACT_APP_BASE_API}`,
  mixpanel_id: `${process.env.REACT_APP_MIXPANEL_ID}`
};

const useConfig = () => {
  const [envVariables, setEnvVariables] = useState<{ [key: string]: string | boolean }>(initialVars);

  const getConfiguration = async () => {
    try {
      const res = (await applicationConfigurationsApiV1ConfigurationsGet()) as unknown;

      setEnvVariables(res as { [key: string]: string | boolean });
    } catch (err) {
      logger.error('error on get configurations', err);
    }
  };

  const initialize = window.location.pathname.includes('complete-details');

  useEffect(() => {
    !initialize && void getConfiguration();
  }, []);

  localStorage.setItem('environment', JSON.stringify(envVariables));

  return envVariables;
};

export default useConfig;
