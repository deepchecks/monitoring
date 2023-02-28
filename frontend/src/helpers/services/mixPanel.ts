import mixpanel from 'mixpanel-browser';

export const reportEvent = (eventName: string, eventData?: { [param: string]: string | number | boolean }) => {
  const userRoute = window.location.pathname;

  mixpanel.track(eventName, { ...eventData, route: userRoute });
};

export const events = {
  authentication: {
    removeUser: 'Remove User',
    inviteUser: 'Invite User',
    signup: 'Sign Up'
  },
  analysisPage: {
    clickedOnFilter: 'Clicked filter',
    clickedComparisonToggle: 'Clicked data comparison toggle',
    clickedPointOnTheGraph: 'Clicked a point on the graph',
    clickedInfoButton: 'Clicked info button',
    clickedGraphLegend: 'Clicked a legend on the graph'
  },
  modelsPage: {
    modelsPageView: 'Models page view',
    openedDeleteModelDialog: ' Opened delete model dialog',
    clickedDeleteModel: 'Clicked delete model',
    clickedViewDetails: 'Clicked view details'
  },
  notificationPage: {
    changedNotification: 'Changed notification'
  },
  integrationsPage: {
    clickedSlackInstagramIntegration: 'Clicked on integration with Slack'
  },
  dashboardPage: {
    savedSuccessfully: 'Saved successfully',
    clickedConfirmDeletion: 'Clicked confirm deletion of monitor',
    clickedEditMonitor: 'Clicked Edit monitor',
    clickedDeleteMonitor: 'Clicked Delete monitor',
    changedTimerFilterProdData: 'Change of time filter for Prediction Data status',
    clickedModelInModelList: 'Clicked a model in the model list',
    exitedEditMonitorWithoutSaving: 'Exited add/edit monitor window without saving'
  },
  alertRulesPage: {
    clickedDeleteRule: 'Clicked delete rule',
    clickedEditRule: 'Clicked Edit Rule button'
  },
  alertsPage: {
    resolveAlerts: 'Resolve alerts',
    clickedResolveAll: 'Clicked the Resolve All',
    navigationBetweenAlerts: 'Navigation between alerts',
    clickedRunTest: 'Run test suite click'
  },
  sidebar: {
    clickedDashboard: 'Clicked the Dashboard',
    clickedAlerts: 'Clicked the Alerts',
    clickedAlertsRules: 'Clicked the Alert Rules',
    clickedNotification: 'Clicked the Notification',
    clickedIntegrations: 'Clicked the Integrations',
    clickedAPIKey: 'Clicked the API Key',
    clickedInviteWorkspace: 'Clicked the Invite to workspace'
  }
};
