export const constants = {
  header: 'Alert',
  conditionTitle: 'Condition:',
  frequencyTitle: 'Check Frequency:',
  frequencyOnce: 'Once',
  alertTitle: 'Alert #:',
  recentAlertTitle: 'Recent Alert:',
  editButton: 'Edit rule',
  deleteButton: 'Delete rule',
  deleteAlertRule: {
    title: 'Delete alert rule',
    submit: 'Yes, continue',
    messageStart: 'You are about to permanently delete ',
    name: (name: string | undefined) => name || 'current',
    messageEnd: ' alert, are you sure?'
  }
};
