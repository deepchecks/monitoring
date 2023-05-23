import React from 'react';

import { Box, Stack } from '@mui/material';

import { ConnectSlack } from './components/ConnectSlack';
import { AlertNotifications } from 'components/Integrations/components/AlertNotifications';
import { StyledText } from 'components/lib';

import { featuresList, PermissionControlWrapper } from 'helpers/permissionControl';
import ConnectPagerDuty from './components/ConnectPagerDuty';
import ConnectWebhook from './components/ConnectWebhook';

export const Integrations = () => {
  return (
    <Box padding="24px">
      <Stack display="flex" flexDirection="row" gap="24px">
        <AlertNotifications />
        <Box display="flex" flexDirection="column" gap="16px">
          <StyledText text="Add New Integrations" type="h1" marginBottom="16px" />
          <ConnectWebhook />
          <PermissionControlWrapper feature={featuresList.slack_enabled}>
            <ConnectSlack />
          </PermissionControlWrapper>
          <ConnectPagerDuty />
        </Box>
      </Stack>
    </Box>
  );
};

export default Integrations;
