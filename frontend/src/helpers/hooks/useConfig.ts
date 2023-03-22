import { useEffect, useState } from 'react';

import logger from 'helpers/services/logger';

import { getApplicationConfigurationsApiV1ConfigurationsGetQueryKey } from 'api/generated';

const initialVars = {
  sentryDsn: `${process.env.REACT_APP_SENTRY_DSN}`,
  stripeApiKey: `${process.env.REACT_APP_STRIPE_KEY}`,
  environment: `${process.env.REACT_APP_BASE_API}`,
  mixpanel_id: `${process.env.REACT_APP_MIXPANEL_ID}`,
  sentryEnv: `${process.env.REACT_APP_SENTRY_ENV}`,
  hotjar_id: `${process.env.REACT_APP_HJ_ID}`,
  hotjar_sv: `${process.env.REACT_APP_HJ_SV}`,
  is_cloud: true
};

const useConfig = () => {
  const [envVariables, setEnvVariables] = useState<{ [key: string]: string | boolean }>(initialVars);

  const getConfiguration = async () => {
    try {
      const res = getApplicationConfigurationsApiV1ConfigurationsGetQueryKey() as unknown;

      setEnvVariables(res as { [key: string]: string | boolean });
    } catch (err) {
      logger.error('error on get configurations', err);
    }
  };

  const initialize = window.location.pathname.includes('complete-details');

  useEffect(() => {
    !initialize && void getConfiguration();
  }, []);

  return envVariables;
};

export default useConfig;
