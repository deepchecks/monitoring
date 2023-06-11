import mixpanel from 'mixpanel-browser';

import { getStorageItem, storageKeys } from 'helpers/utils/localStorage';

export const reportEvent = (eventName: string, eventData?: { [param: string]: any }) => {
  const superProperties = getStorageItem(storageKeys.user);

  mixpanel.track(eventName, { ...eventData, ...superProperties });
};

export const events = {
  onBoarding: {
    onboarding: 'onboarding'
  }
};
