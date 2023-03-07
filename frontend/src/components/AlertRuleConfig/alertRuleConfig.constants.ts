export const constants = {
  deleteAlertRule: {
    title: 'Delete alert rule',
    submit: 'Yes, continue',
    messageStart: 'You are about to permanently delete ',
    name: (name: string | undefined) => name || 'current',
    messageEnd: ' alert, are you sure?'
  }
};
