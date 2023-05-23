import React from 'react';

import {
  useRemoveInstallationApiV1SlackAppsAppIdDelete,
  useRetrieveInstalationsApiV1SlackAppsGet,
  useRetriveOrganizationApiV1OrganizationGet,
  useUpdateOrganizationApiV1OrganizationPut
} from 'api/generated';

import { Box, Stack } from '@mui/material';

import { events, reportEvent } from 'helpers/services/mixPanel';

import { NotificationDictionary, NotificationsResponse } from './AlertNotifications';
import { StyledButton, StyledImage, StyledLoader, StyledText } from '../../lib';

import slack from '../../../assets/integrations/slack.svg';

import { constants } from '../integrations.constants';

interface App {
  id: number;
  team_name: string;
  scope: string;
}

export function ConnectSlack() {
  const { data: apps, isLoading: isAppsLoading } = useRetrieveInstalationsApiV1SlackAppsGet<App[]>();
  const { data: slackConnect, isLoading: isSlackConnectLoading } =
    useRetriveOrganizationApiV1OrganizationGet<NotificationsResponse>();
  const { mutate: updateNotifications, isLoading: isUpdateNotificationsLoading } =
    useUpdateOrganizationApiV1OrganizationPut();
  const { mutate: removeInstallation, isLoading: isRemoveInstallationLoading } =
    useRemoveInstallationApiV1SlackAppsAppIdDelete({
      mutation: {
        onSuccess: () => {
          updateNotifications({ data: { ...slackConnect, [NotificationDictionary.slack]: [] } });
        }
      }
    });

  const isLoading =
    isSlackConnectLoading || isRemoveInstallationLoading || isAppsLoading || isUpdateNotificationsLoading;

  const connectSlack = () => {
    reportEvent(events.integrationsPage.clickedSlackInstagramIntegration);

    window.open(
      `${process.env.REACT_APP_BASE_API}/api/v1/slack.authorize`,
      '_blank',
      'width=600, height=650,scrollbars=1,top=150,left=' + (window.screen.width / 2 - 250)
    );
  };

  const removeSlack = () => {
    if (apps) {
      apps?.forEach(({ id }) => {
        removeInstallation({
          appId: id
        });
      });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ width: '100%' }}>
        <StyledLoader margin="10vh auto" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: '#4A164B',
        borderRadius: '10px',
        padding: '0 24px',
        display: 'flex',
        width: '100%',
        maxWidth: '500px',
        height: '170px'
      }}
    >
      <Box>
        <Stack spacing="16px" pt="10px" marginBottom="20px">
          <StyledText text={constants.connect.slack.title} type="h1" color="white" />
          <StyledText text={constants.connect.slack.description} type="h3" color="white" />
        </Stack>
        {slackConnect?.is_slack_connected ? (
          <StyledButton onClick={removeSlack} label="Uninstall" />
        ) : (
          <StyledButton onClick={connectSlack} label="Connect" />
        )}
      </Box>
      <StyledImage alt="slack" src={slack} width="100px" height="100px" margin="auto" />
    </Box>
  );
}
