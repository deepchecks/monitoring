import { Box, Stack } from '@mui/material';
import React from 'react';
import { ConnectSlack } from '../components/ConnectSlack';
import { PageHeader } from '../components/PageHeader';

export const IntegrationsPage = function () {
  return (
    <Box>
      <Stack spacing="40px">
        <PageHeader text="Integrations" />
        <ConnectSlack />
      </Stack>
    </Box>
  );
};
