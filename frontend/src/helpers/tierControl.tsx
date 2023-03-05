import React, { ReactNode, useEffect, useState } from 'react';

import { customInstance } from './services/customAxios';
import logger from './services/logger';

interface Dict {
  type: { [key: string]: number | boolean };
}

const getFeaturesStatus = async ({ setFeatures }: { setFeatures: (arg: Dict['type']) => void }) => {
  try {
    const response = (await customInstance({
      method: 'GET',
      url: '/api/v1/organization/available-features'
    })) as Dict['type'];

    setFeatures(response);
  } catch (err) {
    logger.error(err);
  }
};

interface TierControlProps {
  feature: string;
  children?: ReactNode | ReactNode[];
  showPaymentOption?: ReactNode | ReactNode[];
}

export const TierControlWrapper = ({ children, feature, showPaymentOption }: TierControlProps) => {
  const [features, setFeatures] = useState<Dict['type']>({});

  useEffect(() => void getFeaturesStatus({ setFeatures: setFeatures }), []);

  if (features[feature] === true) {
    return <>{children}</>;
  } else if (showPaymentOption) {
    return <>{showPaymentOption}</>;
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
