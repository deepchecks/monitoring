import React from 'react';

import { Box } from '@mui/material';

import { APIKey } from 'components/APIKey';
import { StyledText } from 'components/lib';

export const APIKeyPage = function () {
  return (
    <Box>
      <StyledText text="API Key" type="h1" margin="24px 12px 16px" />
      <APIKey />
    </Box>
  );
};

export default APIKeyPage;
