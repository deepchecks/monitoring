import React from 'react';

import { StyledDialog } from 'components/lib';

interface WebhookDialogProps {
  open: boolean;
  handleClose: () => void;
}

const WebhookDialog = ({ handleClose, open }: WebhookDialogProps) => {
  const handleSubmitWebhookForm = () => {
    console.log('submit webhook');
  };

  return (
    <StyledDialog
      open={open}
      title={'Create New Webhook'}
      closeDialog={handleClose}
      submitButtonLabel={'Create New Webhook'}
      submitButtonAction={handleSubmitWebhookForm}
    >
      dialog content
    </StyledDialog>
  );
};

export default WebhookDialog;

/*
{
  "kind": "STANDARD",
  "name": "string",
  "description": "",
  "http_url": "string",
  "http_method": "GET",
  "http_headers": {
    "additionalProp1": "string",
    "additionalProp2": "string",
    "additionalProp3": "string"
  },
  "notification_levels": [
    "low"
  ]
}
*/
