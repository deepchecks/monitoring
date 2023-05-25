import React, { useState } from 'react';

import { Box, Stack, useTheme } from '@mui/material';

import { StyledButton, StyledImage, StyledText } from 'components/lib';
import WebhookDialog from './WebhookDialog';

import webhook from '../../../assets/integrations/webhook.svg';

import { constants } from '../integrations.constants';

const ConnectWebhook = ({ isWebhookConnected }: { isWebhookConnected: boolean | undefined }) => {
  const theme = useTheme();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = () => setIsDialogOpen(true);
  const handleCloseDialog = () => setIsDialogOpen(false);

  console.log(isWebhookConnected);
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
          <StyledText text={constants.connect.webhook.title(isWebhookConnected)} type="h1" color="white" />
          <StyledText text={constants.connect.webhook.description} type="h3" color="white" />
        </Stack>
        <StyledButton
          onClick={handleOpenDialog}
          label={constants.connect.webhook.buttonLabel(isWebhookConnected)}
          color="inherit"
          sx={{ background: 'white', color: theme.palette.primary.main, borderRadius: '16px' }}
        />
      </Box>
      <StyledImage alt="webhook" src={webhook} width="100px" height="100px" margin="auto" />
      <WebhookDialog open={isDialogOpen} handleClose={handleCloseDialog} />
    </Box>
  );
};

export default ConnectWebhook;
