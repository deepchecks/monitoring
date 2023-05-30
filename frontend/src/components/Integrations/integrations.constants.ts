export const constants = {
  integration: {
    title: 'Integrations',
    noAPIDataText: 'Got an error from integrations API, please contact us',
    error: {
      roleDenied: 'This operation is only open to your organization admins',
      orgDenied: (isNotAdminOrOwner: boolean) =>
        isNotAdminOrOwner
          ? 'This is open only to users with a paid subscription. \n Contact your admin.'
          : 'This is open only to users with a paid subscription.',
      link: { text: 'You can subscribe here', href: '/workspace-settings' }
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
