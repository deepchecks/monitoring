import mixpanel from 'mixpanel-browser';

export const reportEvent = (eventName: string, eventData?: { [param: string]: string | number | boolean }) => {
  const userRoute = window.location.pathname;

  mixpanel.track(eventName, { ...eventData, route: userRoute });
};

export const events = {
  authentication: {
    logout: 'logout',
    login: 'login',
    signup: 'signup',
    invite: 'invite'
  },
  workspaceSettings: {
    adminModelAssign: 'admin model assign'
  },
  onBoarding: {
    onboarding: 'onboarding'
  }
};
