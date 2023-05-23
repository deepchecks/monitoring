import React, { useState } from 'react';

import { Input } from '@mui/material';

import { StyledDialog } from 'components/lib';

interface WebhookDialogProps {
  open: boolean;
  handleClose: () => void;
}

const WebhookDialog = ({ handleClose, open }: WebhookDialogProps) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const payload = {
    kind: 'STANDARD',
    name: 'string',
    description: '',
    http_url: 'string',
    http_method: 'GET',
    http_headers: {
      additionalProp1: 'string',
      additionalProp2: 'string',
      additionalProp3: 'string'
    },
    notification_levels: ['low']
  };

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
      <Input placeholder="Webhook Name" value={name} onChange={e => setName(e.target.value)} />
      <Input placeholder="Webhook URL" value={url} onChange={e => setUrl(e.target.value)} />
    </StyledDialog>
  );
};

export default WebhookDialog;
