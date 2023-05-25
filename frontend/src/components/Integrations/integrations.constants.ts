export const constants = {
  integration: {
    title: 'Integrations'
  },
  connect: {
    title: 'Add New Integrations',
    slack: {
      title: 'Get notified on Slack',
      description: 'Get DeepChecks alerts and communications via slack integrations.'
    },
    webhook: {
      title: (connected: any) => (connected ? 'Edit your Webhook' : 'Create a Webhook'),
      description: 'Get DeepChecks alerts and communications via Webhook integration.',
      buttonLabel: (connected: any) => (connected ? 'Edit Webhook' : 'Create Webhook')
    },
    pagerDuty: {
      title: 'Get notified on Pager Duty',
      description: 'Get DeepChecks alerts and communications via pagerDuty integration.',
      buttonLabel: 'Connect'
    }
  }
};
