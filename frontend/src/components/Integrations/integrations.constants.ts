export const constants = {
  integration: {
    title: 'Integrations'
  },
  connect: {
    title: 'Add New Integrations',
    slack: {
      title: 'Get notified on Slack',
      description: 'Get DeepChecks alerts and communications via slack integrations.',
      buttonLabel: (connected: boolean | undefined) => (connected ? 'Disconnect' : 'Connect')
    },
    webhook: {
      title: (connected: boolean | undefined) => (connected ? 'Edit your Webhook' : 'Create a Webhook'),
      description: 'Get DeepChecks alerts and communications via Webhook integration.',
      buttonLabel: (connected: boolean | undefined) => (connected ? 'Edit Webhook' : 'Create Webhook')
    }
  }
};
