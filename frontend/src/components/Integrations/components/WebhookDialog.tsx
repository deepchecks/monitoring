import React, { useState } from 'react';

import { Divider, useTheme } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import { StyledContainer, StyledDialog, StyledInput, StyledText } from 'components/lib';

interface WebhookDialogProps {
  open: boolean;
  handleClose: () => void;
}

const WebhookDialog = ({ handleClose, open }: WebhookDialogProps) => {
  const theme = useTheme();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<{ [key: string]: any }>({
    additionalProp1: 'string'
  });

  const payload = {
    kind: 'STANDARD',
    name: name,
    description: '',
    http_url: url,
    http_method: 'GET',
    http_headers: headers,
    notification_levels: ['low', 'high', 'medium', 'critical']
  };

  const handleAddHeader = () => setHeaders({ ...headers, headerKey: '' });

  const handleSubmitWebhookForm = () => {
    console.log('submit webhook', payload);
  };

  return (
    <StyledDialog
      open={open}
      title={'Create New Webhook'}
      closeDialog={handleClose}
      submitButtonLabel={'Create New Webhook'}
      submitButtonAction={handleSubmitWebhookForm}
    >
      <StyledContainer flexDirection="column" gap="16px">
        <StyledInput
          label="Webhook Name"
          placeholder="Enter Name"
          value={name}
          onChange={e => setName(e.target.value)}
          onCloseIconClick={() => setName('')}
        />
        <StyledInput
          label="Webhook URL"
          placeholder="Enter URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onCloseIconClick={() => setUrl('')}
        />
        <Divider sx={{ margin: '16px 0' }} />
        {Object.keys(headers).map((headerKey, i) => {
          const borderTop = i > 0 ? `2px dashed ${theme.palette.primary.main}` : 'none';

          return (
            <StyledContainer key={i} borderTop={borderTop} borderRadius="0">
              <StyledInput
                label="Header Name"
                placeholder="Enter Header Name"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onCloseIconClick={() => ''}
              />
              <StyledInput
                label="Header Value"
                placeholder="Enter Header Value"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onCloseIconClick={() => ''}
              />
            </StyledContainer>
          );
        })}
        <StyledContainer flexDirection="row" alignItems="center" sx={{ cursor: 'pointer' }} onClick={handleAddHeader}>
          <AddCircleOutlineIcon color="primary" />
          <StyledText text="Add Header" color={theme.palette.primary.main} type="bodyBold" />
        </StyledContainer>
      </StyledContainer>
    </StyledDialog>
  );
};

export default WebhookDialog;
