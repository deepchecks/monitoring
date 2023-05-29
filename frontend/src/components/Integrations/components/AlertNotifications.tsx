import React, { useEffect, useState } from 'react';

import { AlertSeverity, useUpdateOrganizationApiV1OrganizationPut } from 'api/generated';

import { Box, Checkbox } from '@mui/material';
import { Stack } from '@mui/system';

import { events, reportEvent } from 'helpers/services/mixPanel';

import { StyledImage, StyledText } from 'components/lib';

import mailIcon from 'assets/integrations/mail.svg';
import webhookIcon from 'assets/integrations/purple-webhook.svg';
import slackIcon from 'assets/integrations/slack.svg';

import { constants } from '../integrations.constants';

export enum NotificationDictionary {
  email = 'email_notification_levels',
  slack = 'slack_notification_levels',
  webhook = 'webhook_notification_levels'
}

export interface NotificationsResponse {
  [NotificationDictionary.email]: AlertSeverity[];
  [NotificationDictionary.slack]: AlertSeverity[];
  [NotificationDictionary.webhook]: AlertSeverity[];
  is_slack_connected?: boolean;
  is_webhook_connected?: boolean;
  slug: string;
}

type Notifications = {
  [NotificationDictionary.email]: AlertSeverity[];
  [NotificationDictionary.slack]: AlertSeverity[];
  [NotificationDictionary.webhook]: AlertSeverity[];
};

interface NotificationsMap {
  [NotificationDictionary.email]: { [key: number]: AlertSeverity };
  [NotificationDictionary.slack]: { [key: number]: AlertSeverity };
  [NotificationDictionary.webhook]: { [key: number]: AlertSeverity };
}

type NotificationsOptions =
  | NotificationDictionary.email
  | NotificationDictionary.slack
  | NotificationDictionary.webhook;

const icons = [
  { label: 'slack', Icon: <StyledImage src={slackIcon} /> },
  { label: 'email', Icon: <StyledImage src={mailIcon} /> },
  { label: 'webhook', Icon: <StyledImage src={webhookIcon} /> }
] as const;

const alertConfigurations = ['Critical Alerts', 'High Alerts', 'Medium Alerts', 'Low Alerts'];

const notificationsMap: NotificationsMap = {
  [NotificationDictionary.email]: {
    0: 'critical',
    1: 'high',
    2: 'medium',
    3: 'low'
  },
  [NotificationDictionary.slack]: {
    0: 'critical',
    1: 'high',
    2: 'medium',
    3: 'low'
  },
  [NotificationDictionary.webhook]: {
    0: 'critical',
    1: 'high',
    2: 'medium',
    3: 'low'
  }
};

const notificationsItems = [
  NotificationDictionary.slack,
  NotificationDictionary.email,
  NotificationDictionary.webhook
] as const;

export function AlertNotifications({ data, deniedReason }: { data: NotificationsResponse; deniedReason?: string }) {
  const updateNotifications = useUpdateOrganizationApiV1OrganizationPut();
  const [notifications, setNotifications] = useState<Notifications>({
    [NotificationDictionary.email]: [],
    [NotificationDictionary.slack]: [],
    [NotificationDictionary.webhook]: []
  });

  const bg = (index: number) => (index % 2 !== 0 ? 'transparent' : 'white');

  const handleNotifications = (
    event: React.ChangeEvent<HTMLInputElement>,
    notification: NotificationsOptions,
    severity: AlertSeverity
  ) => {
    setNotifications(prevNotifications => {
      let empty = true;
      const currentNotification = prevNotifications[notification].reduce((acc, item, index) => {
        if (item === severity) {
          empty = false;
          return acc;
        }

        acc.push(item);

        if (prevNotifications[notification].length - 1 === index && empty) {
          acc.push(severity);
        }

        return acc;
      }, [] as AlertSeverity[]);

      const currentNotifications = {
        ...prevNotifications,
        [notification]: prevNotifications[notification].length ? currentNotification : [severity]
      };
      updateNotifications.mutate({ data: currentNotifications });

      return currentNotifications;
    });

    reportEvent(events.notificationPage.changedNotification);
  };

  useEffect(() => {
    if (data) {
      setNotifications({
        [NotificationDictionary.email]: data[NotificationDictionary?.email],
        [NotificationDictionary.slack]: data[NotificationDictionary?.slack],
        [NotificationDictionary.webhook]: data[NotificationDictionary?.webhook]
      } as any);
    }
  }, [data]);

  return (
    <Box width="100%" marginBottom="36px">
      <StyledText text={constants.integration.title} type="h1" marginBottom="36px" />
      <Box
        sx={theme => ({
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          color: theme.palette.text.primary,
          width: 'calc(100% - 12px)'
        })}
      >
        <StyledText text="Alert Notifications" type="bodyBold" />
        <Stack direction="row" spacing="74px">
          {icons.map(({ Icon, label }, index) => {
            return (
              <Box key={index} display="inline-flex" height="24px" alignItems="center" gap="16px">
                {Icon}
                {label}
              </Box>
            );
          })}
        </Stack>
      </Box>
      <Box>
        {alertConfigurations.map((label, index) => (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '9px 24px',
              margin: '10px 0',
              borderRadius: '10px',
              backgroundColor: bg(index),
              ':last-of-type': {
                marginBottom: 0
              }
            }}
            key={index}
          >
            <StyledText text={label} type="bodyBold" fontSize="16px" color="black" />
            <Stack direction="row" spacing="120px">
              {notificationsItems.map(notification => (
                <Box padding="9px" key={notification}>
                  <Checkbox
                    size="small"
                    disabled={!data?.[notification]}
                    onChange={event => handleNotifications(event, notification, notificationsMap[notification][index])}
                    checked={notifications[notification].includes(notificationsMap[notification][index])}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
      <StyledText text={deniedReason} color="red" margin="16px" />
    </Box>
  );
}
