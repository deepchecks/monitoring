import mixpanel from 'mixpanel-browser';

import { getStorageItem, storageKeys } from 'helpers/utils/localStorage';

export const reportEvent = (eventName: string, eventData?: { [param: string]: any }) => {
  const superProperties = getStorageItem(storageKeys.user);

  mixpanel.track(eventName, { ...eventData, ...superProperties });
};

export const events = {
  authentication: {
    logout: 'logout', // TODO - Add method {google/email}
    login: 'login', // TODO - Implement + method {google/email}
    signup: 'signup' // TODO - Implement + method {google/email}
  },
  workspaceSettings: {
    adminModelAssign: 'admin model assign',
    invite: 'invite'
  },
  onBoarding: {
    onboarding: 'onboarding'
  }
};
