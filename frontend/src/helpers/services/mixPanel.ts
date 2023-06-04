import mixpanel from 'mixpanel-browser';

export const reportEvent = (eventName: string, eventData?: { [param: string]: any }) => {
  const superProperties = {
    u_id: 1,
    u_role: '',
    u_email: '',
    u_name: '',
    u_org: '',
    u_created_at: '',
    o_deployment: '',
    o_tier: '',
    o_name: '',
    o_version: ''
  };

  mixpanel.track(eventName, { ...eventData, ...superProperties });
};

export const events = {
  authentication: {
    logout: 'logout',
    login: 'login',
    signup: 'signup'
  },
  workspaceSettings: {
    adminModelAssign: 'admin model assign',
    invite: 'invite'
  },
  onBoarding: {
    onboarding: 'onboarding'
  }
};
