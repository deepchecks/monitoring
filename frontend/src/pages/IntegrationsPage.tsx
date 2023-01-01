import React from 'react';

import { Box, Stack } from '@mui/material';

import { ConnectSlack } from '../components/ConnectSlack';
import HeaderLayout from 'components/HeaderLayout';

export const IntegrationsPage = function () {
  return (
    <Box>
      <Stack spacing="40px">
        <HeaderLayout title="Integrations" />
        <ConnectSlack />
      </Stack>
    </Box>
  );
};

export default IntegrationsPage;