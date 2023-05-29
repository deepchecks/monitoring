import React from 'react';

import {
  useRemoveInstallationApiV1SlackAppsAppIdDelete,
  useRetrieveInstalationsApiV1SlackAppsGet,
  useRetriveOrganizationApiV1OrganizationGet,
  useUpdateOrganizationApiV1OrganizationPut
} from 'api/generated';

import { alpha, Box, Stack } from '@mui/material';

import { events, reportEvent } from 'helpers/services/mixPanel';

import { NotificationDictionary, NotificationsResponse } from '../Notifications/AlertNotifications';
import { StyledButton, StyledImage, StyledLoader, StyledText } from '../lib';

import slack from '../../assets/icon/slack.png';

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
        <StyledLoader />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px 20px 30px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        width: '100%',
        maxWidth: '888px',
        boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)',
        position: 'relative',
        overflow: 'hidden',
        '::before': {
          content: "''",
          height: '100%',
          width: 10,
          position: 'absolute',
          left: 0,
          top: 0,
          background: `linear-gradient(${alpha('#36C5F0', 0.5)} 0%,
          ${alpha('#2EB67D', 0.5)} 36%, 
          ${alpha('#ECB22E', 0.5)} 67%, 
          ${alpha('#E01E5A', 0.5)} 100%)`
        }
      }}
    >
      <Box maxWidth={620}>
        <Stack spacing="16px" pt="10px">
          <StyledText text="Slack" type="h1" />
          <StyledText text="Get DeepChecks alerts and communications via slack integrations." type="h3" />
        </Stack>
        {slackConnect?.is_slack_connected ? (
          <StyledButton onClick={removeSlack} label="Uninstall" margin="24px 0 0" />
        ) : (
          <StyledButton onClick={connectSlack} label="Connect" margin="24px 0 0" />
        )}
      </Box>
      <StyledImage alt="slack" src={slack} width="100px" height="100px" margin="25px" />
    </Box>
  );
}
