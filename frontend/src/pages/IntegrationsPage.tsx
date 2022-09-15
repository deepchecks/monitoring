import { Box, Stack } from '@mui/material';
import { ConnectSlack } from '../components/ConnectSlack';
import { PageHeader } from '../components/PageHeader';

export const IntegrationsPage = function() {
  return (
    <Box padding="0 40px">
      <Stack spacing="40px">
        <PageHeader text="Integrations" />
        <ConnectSlack />
      </Stack>
    </Box>
  );
};
