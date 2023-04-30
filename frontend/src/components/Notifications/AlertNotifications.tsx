import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  AlertSeverity,
  useRetriveOrganizationApiV1OrganizationGet,
  useUpdateOrganizationApiV1OrganizationPut
} from 'api/generated';

import { Box, Checkbox } from '@mui/material';
import { Stack } from '@mui/system';

import { events, reportEvent } from 'helpers/services/mixPanel';
import { featuresList, TierControlWrapper } from 'helpers/tierControl';

import { Loader } from '../Loader';
import { StyledButton, StyledText } from 'components/lib';

import { Email, Slack } from '../../assets/icon/icon';
import connectSlackBG from '../../assets/bg/connectSlackBG.svg';

import { theme } from 'components/lib/theme';

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
    2: 'medium',
    3: 'low'
  },
  [NotificationDictionary.slack]: {
    0: 'critical',
    1: 'high',
    2: 'medium',
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
      navigate({ pathname: '/configuration/integrations', search: window.location.search });
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

    reportEvent(events.notificationPage.changedNotification);
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
    <Box width="100%" maxWidth="900px">
      <Box
        sx={theme => ({
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          backgroundColor: theme.palette.grey[200],
          color: theme.palette.text.primary,
          width: 'calc(100% - 12px)'
        })}
      >
        <StyledText text="Alert Notifications" type="bodyBold" />
        <Stack direction="row" spacing="60px">
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
                <StyledText text={label} />
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
              margin: '10px 0',
              ':last-of-type': {
                marginBottom: 0
              }
            }}
            key={index}
          >
            <StyledText text={label} type="bodyNormal" />
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
      <TierControlWrapper feature={featuresList.slack_enabled}>
        {!data?.is_slack_connected && (
          <Box
            sx={{
              padding: '20px 30px',
              background: `url(${connectSlackBG}) no-repeat right`,
              backgroundColor: '#F1E9FE',
              borderRadius: '16px',
              boxShadow: `0 0 3px 0.5px ${theme.palette.primary.main}`,
              marginTop: '124px',
              gap: '24px'
            }}
          >
            <StyledText type="h2" text="Get notified on slack" />
            <Box margin="10px 0 16px">
              <StyledText type="bodyNormal" text="Get DeepChecks alerts and communications via slack integrations" />
            </Box>
            <StyledButton label="Connect" onClick={linkToConnectSlack} />
          </Box>
        )}
      </TierControlWrapper>
    </Box>
  );
}
