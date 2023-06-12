export const constants = {
  submitButtonLabel: (isCreateAlert: boolean) => (isCreateAlert ? 'Save & Activate' : 'Save'),
  activeAlertsModal: {
    title: 'Confirmation',
    submitButtonLabel: 'OK',
    message:
      'This monitor has active alerts connected to it. In order to edit the monitor, all alerts must be resolved first.Are you sure you want to edit this monitor and resolve all alerts connected to it?'
  },
  createAlertForm: {
    severityLabel: 'Severity'
  },
  selectCondition: {
    titleStr: 'Activate alert when check value is:',
    selectOperatorLabel: 'Select Operator',
    thresholdLabel: 'Threshold',
    thresholdPlaceholder: '0'
  },
  monitorForm: {
    monitorNameLabel: 'Monitor name',
    modelLabel: 'Model',
    frequencyLabel: 'Frequency',
    frequencyTooltip: 'The frequency of sampling the monitor data',
    aggWindowLabel: 'Aggregation window',
    displayRangeLabel: 'Display range',
    displayRangeTooltip: 'The range of viewing the monitor: e.g. from <date> to <date>',
    aggWindowError: 'Aggregation window max value is 30<',
    resetToDefault: 'Reset to default',
    advancedStr: 'Advanced',
    aggValueStr: 'Aggregation value'
  }
};
