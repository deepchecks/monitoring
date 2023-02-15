import React from 'react';

import {
  useRemoveInstallationApiV1SlackAppsAppIdDelete,
  useRetrieveInstalationsApiV1SlackAppsGet,
  useRetriveOrganizationApiV1OrganizationGet,
  useUpdateOrganizationApiV1OrganizationPut
} from 'api/generated';

import { alpha, Box, Button, Stack, Typography } from '@mui/material';

import { events, reportEvent } from 'helpers/mixPanel';

import { NotificationDictionary, NotificationsResponse } from './AlertNotifications';
import { Loader } from './Loader';

import slack from '../assets/icon/slack.png';

interface App {
  id: number;
  team_name: string;
  scope: string;
}

export function ConnectSlack() {
  const { data: slackConnect, isLoading: isSlackConnectLoading } =
    useRetriveOrganizationApiV1OrganizationGet<NotificationsResponse>();
  const { mutate: updateNotifications, isLoading: isUpdateNotificationsLoading } =
    useUpdateOrganizationApiV1OrganizationPut();

  const { data: apps, isLoading: isAppsLoading } = useRetrieveInstalationsApiV1SlackAppsGet<App[]>();
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
      <Box sx={{ width: 888 }}>
        <Loader />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: '10px',
        padding: '30px 30px 40px 50px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        width: 888,
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
          <Typography variant="h5">Slack</Typography>
          <Typography variant="body2">
            Get DeepChecks alerts and communications via slack integrations. Get DeepChecks alerts and communications
            via slack integrations.
          </Typography>
        </Stack>
        {slackConnect?.is_slack_connected ? (
          <Button
            onClick={removeSlack}
            variant="outlined"
            sx={{ marginTop: '33px', width: 144, height: 42, borderColor: 'primary.main' }}
          >
            Uninstall
          </Button>
        ) : (
          <Button onClick={connectSlack} variant="contained" sx={{ marginTop: '33px', width: 144, height: 42 }}>
            Connect
          </Button>
        )}
      </Box>
      <img alt="slack" src={slack} />
    </Box>
  );
}
