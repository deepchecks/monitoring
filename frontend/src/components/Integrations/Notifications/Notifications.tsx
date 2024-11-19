import React from 'react';

import { Box, Stack, useMediaQuery, useTheme } from '@mui/material';

import { useRetriveOrganizationApiV1OrganizationGet } from 'api/generated';

import {
  AlertNotifications,
  NotificationsResponse
} from 'components/Integrations/Notifications/components/AlertNotifications';
import ConnectWebhook from './components/ConnectWebhook';
import ConnectSlack from './components/ConnectSlack';
import { StyledText, StyledLoader } from 'components/lib';

import { resError } from 'helpers/types/resError';
import useUser from 'helpers/hooks/useUser';

import { constants } from '../integrations.constants';

export const Notifications = () => {
  const theme = useTheme();
  const { isAdmin, isOwner, user } = useUser();
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('xl'));
  const { data, isLoading, refetch } = useRetriveOrganizationApiV1OrganizationGet<NotificationsResponse>({
    query: {
      cacheTime: 0,
      staleTime: Infinity
    }
  });

  const isNotAdminOrOwner = !isAdmin && !isOwner;
  const isNotPaid = user?.organization?.tier === 'FREE';
  const deniedDisplayText = isNotPaid
    ? constants.integration.error.orgDenied(isNotAdminOrOwner)
    : constants.integration.error.roleDenied;
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
      <Stack display={stackDisplay} flexDirection="row" gap="85px">
        <AlertNotifications
          data={data}
          deniedReason={deniedReason}
          isNotAdminOrOwner={isNotAdminOrOwner}
          isNotPaid={isNotPaid}
        />
        <Box display="flex" flexDirection="column" gap="16px">
          <ConnectWebhook
            isWebhookConnected={isWebhookConnected}
            disabled={isNotAdminOrOwner || isNotPaid}
            refetch={refetch}
          />
          <ConnectSlack isSlackConnected={isSlackConnected} disabled={isNotAdminOrOwner || isNotPaid} />
        </Box>
      </Stack>
    );
  }
};

export default Notifications;
