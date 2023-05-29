export const constants = {
  integration: {
    title: 'Integrations',
    noAPIDataText: 'Got an error from integrations API, please contact us',
    error: {
      roleDenied:
        'You cant perform the disabled actions because you are not an admin, please contact your admin/owner.',
      orgDenied: 'In order to perform the disabled actions you need to set up a subscription with deepchecks.'
    }
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
