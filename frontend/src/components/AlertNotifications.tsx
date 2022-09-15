import { Box, Button, Checkbox, Typography } from '@mui/material';
import { Stack } from '@mui/system';
import {
  AlertSeverity,
  useRetriveOrganizationApiV1OrganizationGet,
  useUpdateOrganizationApiV1OrganizationPut
} from 'api/generated';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import connectSlackBG from '../assets/bg/connectSlackBG.svg';
import { Email, Slack } from '../assets/icon/icon';
import { Loader } from './Loader';

export enum NotificationDictionary {
  email = 'email_notification_levels',
  slack = 'slack_notification_levels'
}

export interface NotificationsResponse {
  [NotificationDictionary.email]: AlertSeverity[];
  [NotificationDictionary.slack]: AlertSeverity[];
  is_slack_connected: boolean;
  slug: string;
}

type Notifications = {
  [NotificationDictionary.email]: AlertSeverity[];
  [NotificationDictionary.slack]: AlertSeverity[];
};

interface NotificationsMap {
  [NotificationDictionary.email]: { [key: number]: AlertSeverity };
  [NotificationDictionary.slack]: { [key: number]: AlertSeverity };
}

type NotificationsOptions = NotificationDictionary.email | NotificationDictionary.slack;

const icons = [
  { label: 'slack', Icon: Slack },
  { label: 'email', Icon: Email }
] as const;

const alertConfigurations = ['Critical Alerts', 'High Alerts', 'Medium Alerts', 'Low Alerts'];

const notificationsMap: NotificationsMap = {
  [NotificationDictionary.email]: {
    0: 'critical',
    1: 'high',
    2: 'mid',
    3: 'low'
  },
  [NotificationDictionary.slack]: {
    0: 'critical',
    1: 'high',
    2: 'mid',
    3: 'low'
  }
};

const notificationsItems = [NotificationDictionary.slack, NotificationDictionary.email] as const;

export function AlertNotifications() {
  const navigate = useNavigate();
  const { data, isLoading } = useRetriveOrganizationApiV1OrganizationGet<NotificationsResponse>({
    query: {
      cacheTime: 0,
      staleTime: Infinity
    }
  });
  const updateNotifications = useUpdateOrganizationApiV1OrganizationPut();
  const [notifications, setNotifications] = useState<Notifications>({
    [NotificationDictionary.email]: [],
    [NotificationDictionary.slack]: []
  });

  const linkToConnectSlack = () => {
    if (!data?.is_slack_connected) {
      navigate('/configuration/integrations');
    }
  };

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
  };

  useEffect(() => {
    if (data) {
      setNotifications({
        [NotificationDictionary.email]: data[NotificationDictionary.email],
        [NotificationDictionary.slack]: data[NotificationDictionary.slack]
      });
    }
  }, [data]);

  if (isLoading)
    return (
      <Box sx={{ width: 888, display: 'flex', justifyContent: 'center' }}>
        <Loader />
      </Box>
    );

  return (
    <Box width={888}>
      <Box
        sx={theme => ({
          display: 'flex',

          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          backgroundColor: theme.palette.grey[100],
          color: theme.palette.text.primary
        })}
      >
        <Typography variant="button" color="inherit">
          Alert Notifications
        </Typography>
        <Stack direction="row" spacing="34px">
          {icons.map(({ label, Icon }, index) => {
            const condition =
              !data?.is_slack_connected && NotificationDictionary[label] === NotificationDictionary.slack;
            return (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'column',
                  width: 1,
                  opacity: condition ? 0.3 : 1,
                  cursor: condition ? 'pointer' : 'auto'
                }}
                key={index}
                onClick={linkToConnectSlack}
              >
                <Icon />
                <Typography variant="button" color="inherit" lineHeight="13px" mt="6px">
                  {label}
                </Typography>
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
              padding: '9px 16px',
              margin: '24px 0',
              ':last-of-type': {
                marginBottom: 0
              }
            }}
            key={index}
          >
            <Typography variant="body1">{label}</Typography>
            <Stack direction="row" spacing="40px">
              {notificationsItems.map(notification => (
                <Box padding="9px" key={notification}>
                  <Checkbox
                    size="small"
                    disabled={notification === NotificationDictionary.slack && !data?.is_slack_connected}
                    onChange={event => handleNotifications(event, notification, notificationsMap[notification][index])}
                    checked={notifications[notification].includes(notificationsMap[notification][index])}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
      {!data?.is_slack_connected && (
        <Box
          sx={theme => ({
            padding: '20px 30px',
            background: `url(${connectSlackBG}) no-repeat right`,
            backgroundColor: theme.palette.primary.contrastText,
            borderRadius: '10px',
            marginTop: '124px'
          })}
        >
          <Typography variant="subtitle1">Get notified on slack</Typography>
          <Typography variant="body2" mt="2px">
            Get DeepChecks alerts and communications via slack integrations.
          </Typography>
          <Button
            size="small"
            variant="contained"
            sx={{ marginTop: '24px', height: 30, width: 144 }}
            onClick={linkToConnectSlack}
          >
            Connect
          </Button>
        </Box>
      )}
    </Box>
  );
}
