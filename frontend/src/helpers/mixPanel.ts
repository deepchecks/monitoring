import mixpanel from 'mixpanel-browser';

export const reportEvent = (eventName: string, eventData?: { [param: string]: string | number | boolean }) => {
  const userRoute = window.location.pathname;

  mixpanel.track(eventName, { ...eventData, route: userRoute });
};

export const events = {
  // Todo - organize all the events according to their pages (like analysisPage)
  changedNotification: 'Changed notification',
  clickedSlackInstagramIntegration: 'Clicked on integration with Slack',
  navigationBetweenAlerts: 'Navigation between alerts',
  clickedResolveAll: 'Clicked the Resolve All',
  clickedEditRule: 'Clicked Edit Rule button',
  clickedOnAlert: 'Clicked the alert',
  changedTimerFilterProdData: 'Change of time filter for Prediction Data status',
  clickedModelInModelList: 'Clicked a model in the model list',
  exitedEditMonitorWithoutSaving: 'Exited add/edit monitor window without saving',
  savedSuccessfully: 'Saved successfully',
  clickedConfirmDeletion: 'Clicked confirm deletion of monitor',
  clickedEditMonitor: 'Clicked Edit monitor',
  clickedDeleteMonitor: 'Clicked Delete monitor',
  clickedGraphLegend: 'Clicked a legend on the graph',
  clickedRunTest: 'Run test suite click',
  clickedInviteWorkspace: 'Clicked the Invite to workspace',
  clickedDashboard: 'Clicked the Dashboard',
  clickedAlerts: 'Clicked the Alerts',
  clickedAlertsRules: 'Clicked the Alert Rules',
  clickedNotification: 'Clicked the Notification',
  clickedIntegrations: 'Clicked the Integrations',
  clickedAPIKey: 'Clicked the API Key',
  removeUser: 'Remove User',
  inviteUser: 'Invite User',
  clickedDeleteRule: 'Clicked delete rule',
  resolveAlerts: 'Resolve alerts',
  signup: 'Sign Up',
  analysisPage: {
    clickedOnFilter: 'Clicked filter',
    clickedComparisonToggle: 'Clicked data comparison toggle',
    clickedPointOnTheGraph: 'Clicked a point on the graph',
    clickedInfoButton: 'Clicked info button'
  },
  modelsPage: {
    modelsPageView: 'Models page view',
    openedDeleteModelDialog: ' Opened delete model dialog',
    clickedDeleteModel: 'Clicked delete model',
    clickedViewDetails: 'Clicked view details'
  }
};
