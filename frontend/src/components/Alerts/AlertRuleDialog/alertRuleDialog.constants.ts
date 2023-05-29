export const constants = {
  dialogHeader: (title: string | undefined) => (title ? `Edit Alert: ${title}` : 'Create New Alert'),
  buttons: {
    back: (isFirst: boolean) => (isFirst ? 'Cancel' : 'Back'),
    next: (isNext: boolean) => (isNext ? 'Save' : 'Next')
  },
  content: {
    stepTitles: {
      basic: 'Basic Info',
      monitor: 'Monitor Data',
      rule: 'Rule'
    }
  },
  stepOne: {
    nameLabel: 'Alert rule name'
  },
  stepTwo: {
    aggregationPlaceholder: 'Aggregation window',
    frequency: {
      tooltipTitle: 'The frequency of sampling the monitor data',
      label: 'Frequency'
    },
    checkBoxLabel: 'Show in dashboard'
  }
};
