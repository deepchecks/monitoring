import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGetOrCreateDashboardApiV1DashboardsGet } from 'api/generated';
import { featuresList, usePermissionControl } from 'helpers/base/permissionControl';
import { getStorageItem, storageKeys } from 'helpers/utils/localStorage';

const useOnboarding = () => {
  const navigate = useNavigate();
  const onboardingEnabled = usePermissionControl({ feature: featuresList.onboarding_enabled });
  const { data } = useGetOrCreateDashboardApiV1DashboardsGet();

  const isCloud = getStorageItem(storageKeys.environment)['is_cloud'];

  useEffect(() => {
    if (data?.monitors?.length === 0 && (onboardingEnabled || !isCloud)) {
      navigate({ pathname: '/onboarding' });
    }
  }, [data, onboardingEnabled]);

  return '';
};

export default useOnboarding;
