import React from 'react';

import { Box, Stack } from '@mui/material';

import { StyledButton, StyledImage, StyledText } from 'components/lib';

import webhook from '../../../assets/integrations/webhook.svg';

import { constants } from '../integrations.constants';

const ConnectWebhook = () => {
  return (
    <Box
      sx={{
        background: '#7964FF',
        borderRadius: '10px',
        padding: '0 24px',
        display: 'flex',
        width: '100%',
        maxWidth: '500px',
        height: '170px'
      }}
    >
      <Box>
        <Stack spacing="16px" pt="10px" marginBottom="20px">
          <StyledText text={constants.connect.webhook.title} type="h1" color="white" />
          <StyledText text={constants.connect.webhook.description} type="h3" color="white" />
        </Stack>
        <StyledButton onClick={() => ''} label="Uninstall" color="inherit" />
      </Box>
      <StyledImage alt="webhook" src={webhook} width="100px" height="100px" margin="auto" />
    </Box>
  );
};

export default ConnectWebhook;
