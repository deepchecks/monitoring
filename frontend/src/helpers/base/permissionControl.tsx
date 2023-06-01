import React, { ReactNode, useEffect, useState } from 'react';

import { getAvailableFeaturesApiV1OrganizationAvailableFeaturesGet } from 'api/generated';

import { resError } from '../types/resError';

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
  sso_enabled: 'sso_enabled',
  onboarding_enabled: 'onboarding_enabled',
  email_enabled: 'email_enabled'
};

const getFeaturesStatus = async ({ setFeatures }: { setFeatures: (arg: Dict['type']) => void }) => {
  const response = (await getAvailableFeaturesApiV1OrganizationAvailableFeaturesGet()) as unknown as Dict['type'];

  if (response && !(response as unknown as resError).error_message) {
    setFeatures(response);
  }
};

interface TierControlProps {
  feature: string;
  children?: ReactNode | ReactNode[];
  fallbackOption?: ReactNode | ReactNode[];
}

export const PermissionControlWrapper = ({ children, feature, fallbackOption }: TierControlProps) => {
  const [features, setFeatures] = useState<Dict['type']>({});

  useEffect(() => void getFeaturesStatus({ setFeatures }), []);

  if (features[feature] === true) {
    return <>{children}</>;
  } else if (fallbackOption) {
    return <>{fallbackOption}</>;
  } else {
    return <></>;
  }
};

export const usePermissionControl = ({ feature }: TierControlProps) => {
  const [features, setFeatures] = useState<Dict['type']>({});

  useEffect(() => void getFeaturesStatus({ setFeatures }), []);

  return features[feature] === true;
};
