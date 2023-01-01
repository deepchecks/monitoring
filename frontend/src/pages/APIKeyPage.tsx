import React from 'react';

import { Box, Stack } from '@mui/material';

import { APIKey } from 'components/APIKey';
import HeaderLayout from 'components/HeaderLayout';

export const APIKeyPage = function () {
  return (
    <Box>
      <Stack spacing="40px">
        <HeaderLayout title="API Key" />
        <APIKey />
      </Stack>
    </Box>
  );
};

export default APIKeyPage;