import React from 'react';

import { Box, Stack } from '@mui/material';

import { AlertNotifications } from '../components/AlertNotifications';
import HeaderLayout from 'components/HeaderLayout';

export const NotificationsPage = function () {
  return (
    <Box>
      <Stack spacing="50px">
        <HeaderLayout title="Alert Notifications" />
        <AlertNotifications />
      </Stack>
    </Box>
  );
};

export default NotificationsPage;