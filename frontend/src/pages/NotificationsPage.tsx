import { Box, Stack } from '@mui/material';
import React from 'react';
import { AlertNotifications } from '../components/AlertNotifications';
import { PageHeader } from '../components/PageHeader';

export const NotificationsPage = function () {
  return (
    <Box>
      <Stack spacing="50px">
        <PageHeader text="Alert Notifications" />
        <AlertNotifications />
      </Stack>
    </Box>
  );
};
