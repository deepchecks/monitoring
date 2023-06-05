export const constants = {
  tabs: {
    data: 'Data',
    notifications: 'Notifications'
  },
  integration: {
    title: 'Integrations',
    noAPIDataText: 'Got an error from integrations API, please contact us',
    error: {
      roleDenied: 'This operation is only open to your organization admins',
      orgDenied: (isNotAdminOrOwner: boolean) =>
        isNotAdminOrOwner
          ? 'This is open only to users with a paid subscription. \n Contact your admin.'
          : 'This is open only to users with a paid subscription.',
      link: { text: 'You can subscribe here', href: '/workspace-settings' },
      emailConfig: 'Email is not configured. Learn how to configure it on our docs.' // TODO - Update to a link once we have it on docs
    }
  },
  connect: {
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
  },
  data: {
    tableNameColumn: 'Data Integration',
    tableStatusColumn: 'Status',
    s3: {
      name: 'AWS S3',
      status: (isConnected: boolean) => (isConnected ? 'Connected' : 'Connect AWS S3')
    }
  }
};
