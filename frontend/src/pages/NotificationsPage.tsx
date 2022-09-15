import { Box, Stack } from '@mui/material';
import { AlertNotifications } from '../components/AlertNotifications';
import { PageHeader } from '../components/PageHeader';

export const NotificationsPage = function() {
  return (
    <Box padding="0 40px">
      <Stack spacing="50px">
        <PageHeader text="Alert Notifications" />
        <AlertNotifications />
      </Stack>
    </Box>
  );
};
