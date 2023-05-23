import React, { useState } from 'react';

import { Box, Stack } from '@mui/material';

import { StyledButton, StyledImage, StyledText } from 'components/lib';

import webhook from '../../../assets/integrations/webhook.svg';

import { constants } from '../integrations.constants';
import WebhookDialog from './WebhookDialog';

const ConnectWebhook = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = () => setIsDialogOpen(true);
  const handleCloseDialog = () => setIsDialogOpen(false);

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
        <StyledButton onClick={handleOpenDialog} label={constants.connect.webhook.buttonLabel} color="inherit" />
      </Box>
      <StyledImage alt="webhook" src={webhook} width="100px" height="100px" margin="auto" />
      <WebhookDialog open={isDialogOpen} handleClose={handleCloseDialog} />
    </Box>
  );
};

export default ConnectWebhook;
