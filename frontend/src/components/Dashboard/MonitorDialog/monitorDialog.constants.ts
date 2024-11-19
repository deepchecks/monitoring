export const constants = {
  submitButtonLabel: (isCreateAlert: boolean, activeStep: number) =>
    isCreateAlert ? 'Save & Activate' : activeStep === 0 ? 'Next' : 'Save',
  cancelButtonLabel: (activeStep: number) => (activeStep === 0 ? 'Cancel' : 'Back'),
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
    steps: { basicInfo: 'Basic Info', monitorData: 'Monitor Data' },
    monitorNameLabel: 'Monitor name',
    modelLabel: 'Model',
    frequencyLabel: 'Frequency',
    frequencyTooltip: 'The frequency of sampling the monitor data',
    advancedStr: 'Advanced',
    aggregationStr: 'Aggregation'
  }
};
