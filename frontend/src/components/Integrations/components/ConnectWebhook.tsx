import React from 'react';

import { Box, Stack } from '@mui/material';

import { StyledButton, StyledImage, StyledText } from 'components/lib';

import webhook from '../../../assets/integrations/webhook.svg';

const ConnectWebhook = () => {
  return (
    <Box
      sx={{
        background: '#7964FF',
        borderRadius: '10px',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)',
        position: 'relative',
        overflow: 'hidden',
        height: '170px'
      }}
    >
      <Box maxWidth={620}>
        <Stack spacing="16px" pt="10px">
          <StyledText text="Create a Webhook" type="h1" color="white" />
          <StyledText
            text="Get DeepChecks alerts and communications via Webhook integration."
            type="h3"
            color="white"
          />
        </Stack>
        <StyledButton onClick={() => ''} label="Uninstall" margin="24px 0 0" />
      </Box>
      <StyledImage alt="webhook" src={webhook} width="100px" height="100px" margin="24px 0" />
    </Box>
  );
};

export default ConnectWebhook;
