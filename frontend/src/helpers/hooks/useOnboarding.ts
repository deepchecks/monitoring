import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGetOrCreateDashboardApiV1DashboardsGet } from 'api/generated';
import { featuresList, usePermissionControl } from 'helpers/base/permissionControl';
import { getStorageItem, removeStorageItem, setStorageItem, storageKeys } from 'helpers/utils/localStorage';

const useOnboarding = () => {
  const navigate = useNavigate();
  const { data } = useGetOrCreateDashboardApiV1DashboardsGet(); // TODO - Use another condition
  const onboardingEnabled = usePermissionControl({ feature: featuresList.onboarding_enabled });

  const isCloud = getStorageItem(storageKeys.environment)['is_cloud'];
  const isOnboardingStorage = getStorageItem(storageKeys.is_onboarding);

  useEffect(() => {
    if ((isOnboardingStorage || data?.monitors?.length === 0) && (onboardingEnabled || !isCloud)) {
      setStorageItem(storageKeys.is_onboarding, true);
      navigate({ pathname: '/onboarding' });
    } else {
      removeStorageItem(storageKeys.is_onboarding);
    }
  }, [data, onboardingEnabled]);

  return '';
};

export default useOnboarding;
