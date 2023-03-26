import React, { ReactNode, useEffect, useState } from 'react';

import logger from './services/logger';

import { getAvailableFeaturesApiV1OrganizationAvailableFeaturesGet } from 'api/generated';

interface Dict {
  type: { [key: string]: number | boolean };
}

export const featuresList = {
  max_models: 'max_models',
  signup_enabled: 'signup_enabled',
  slack_enabled: 'slack_enabled',
  rows_per_minute: 'rows_per_minute',
  custom_checks_enabled: 'custom_checks_enabled',
  data_retention_months: 'data_retention_months',
  monthly_predictions_limit: 'monthly_predictions_limit',
  sso_enabled: 'sso_enabled'
};

const getFeaturesStatus = async ({ setFeatures }: { setFeatures: (arg: Dict['type']) => void }) => {
  try {
    const response = (await getAvailableFeaturesApiV1OrganizationAvailableFeaturesGet()) as unknown as Dict['type'];

    setFeatures(response);
  } catch (err) {
    logger.error(err);
  }
};

interface TierControlProps {
  feature: string;
  children?: ReactNode | ReactNode[];
  fallbackOption?: ReactNode | ReactNode[];
}

export const TierControlWrapper = ({ children, feature, fallbackOption }: TierControlProps) => {
  const [features, setFeatures] = useState<Dict['type']>({});

  useEffect(() => void getFeaturesStatus({ setFeatures: setFeatures }), []);

  if (features[feature] === true) {
    return <>{children}</>;
  } else if (fallbackOption) {
    return <>{fallbackOption}</>;
  } else {
    return <></>;
  }
};

export const useTierControl = ({ feature }: TierControlProps) => {
  const [features, setFeatures] = useState<Dict['type']>({});

  useEffect(() => void getFeaturesStatus({ setFeatures: setFeatures }), []);

  if (features[feature] === true) {
    return true;
  } else {
    return false;
  }
};
