import React from 'react';

import { Box, Stack, useMediaQuery, useTheme } from '@mui/material';

import { useRetriveOrganizationApiV1OrganizationGet } from 'api/generated';

import { AlertNotifications, NotificationsResponse } from 'components/Integrations/components/AlertNotifications';
import { StyledText, StyledLoader } from 'components/lib';
import ConnectWebhook from './components/ConnectWebhook';
import ConnectSlack from './components/ConnectSlack';

import { resError } from 'helpers/types/resError';
import useUser from 'helpers/hooks/useUser';

import { constants } from './integrations.constants';

export const Integrations = () => {
  const theme = useTheme();
  const { isAdmin, isOwner, availableFeatures } = useUser();
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('xl'));
  const { data, isLoading } = useRetriveOrganizationApiV1OrganizationGet<NotificationsResponse>({
    query: {
      cacheTime: 0,
      staleTime: Infinity
    }
  });

  const isNotAdminOrOwner = !isAdmin && !isOwner;
  const isNotPaid = !availableFeatures?.slack_enabled; // Currently unavailable slack means no subscription (paid plan)
  const deniedDisplayText = isNotPaid ? constants.integration.error.orgDenied : constants.integration.error.roleDenied;
  const deniedReason = isNotAdminOrOwner || isNotPaid ? deniedDisplayText : '';
  const stackDisplay = isLargeDesktop ? 'flex' : 'block';
  const isSlackConnected = data?.is_slack_connected;
  const isWebhookConnected = data?.is_webhook_connected;

  if (isLoading) {
    return <StyledLoader />;
  } else if ((data as unknown as resError)?.error_message || data === undefined) {
    return (
      <StyledText
        text={constants.integration.noAPIDataText}
        type="h1"
        margin="20vh auto"
        color={theme.palette.error.main}
      />
    );
  } else {
    return (
      <Box padding="24px">
        <Stack display={stackDisplay} flexDirection="row" gap="85px">
          <AlertNotifications
            data={data}
            deniedReason={deniedReason}
            isNotAdminOrOwner={isNotAdminOrOwner}
            isNotPaid={isNotPaid}
          />
          <Box display="flex" flexDirection="column" gap="16px">
            <StyledText text={constants.connect.title} type="h1" marginBottom="16px" />
            <ConnectWebhook isWebhookConnected={isWebhookConnected} disabled={isNotAdminOrOwner || isNotPaid} />
            <ConnectSlack isSlackConnected={isSlackConnected} disabled={isNotAdminOrOwner || isNotPaid} />
          </Box>
        </Stack>
      </Box>
    );
  }
};

export default Integrations;
