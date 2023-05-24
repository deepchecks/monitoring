import React, { useState } from 'react';

import { useTheme } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import { StyledContainer, StyledDialog, StyledInput, StyledText } from 'components/lib';

import { StandardWebhookProperties, createWebhookApiV1AlertWebhooksPost } from 'api/generated';

import { resError } from 'helpers/types/resError';

interface WebhookDialogProps {
  open: boolean;
  handleClose: () => void;
}

const WebhookDialog = ({ handleClose, open }: WebhookDialogProps) => {
  const theme = useTheme();

  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST'>('GET');
  const [description, setDescription] = useState('');
  const [headers, setHeaders] = useState<{ [key: string]: any }>({ Name: 'Value' });

  const payload: StandardWebhookProperties = {
    kind: 'STANDARD',
    name: name,
    description: description,
    http_url: url,
    http_method: httpMethod,
    http_headers: headers,
    notification_levels: ['low', 'high', 'medium', 'critical']
  };

  const handleAddHeader = () => setHeaders({ ...headers, 'Header (Cant be null)': 'Value' });

  const handleHeaderChange = (key: string, value: string, prevKey?: string) => {
    if (key) {
      if (prevKey) {
        const updatedHeaders = { ...headers };

        delete updatedHeaders[prevKey];

        setHeaders({ ...updatedHeaders, [key]: value });
      } else {
        setHeaders({ ...headers, [key]: value });
      }
    }
  };

  const handleSubmitWebhookForm = async () => {
    const response = await createWebhookApiV1AlertWebhooksPost(payload);

    if ((response as unknown as resError)?.error_message) {
      setError(response.error_message as any);
    } else {
      window.location.reload();
    }
  };

  return (
    <StyledDialog
      open={open}
      title="Create New Webhook"
      closeDialog={handleClose}
      submitButtonLabel="Create New Webhook"
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
        <StyledInput
          label="Http Method"
          placeholder="GET / POST"
          value={httpMethod}
          onChange={e => setHttpMethod(e.target.value.toUpperCase() as 'GET' | 'POST')}
        />
        <StyledInput
          label="Description"
          placeholder="Enter Description (Optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onCloseIconClick={() => setDescription('')}
        />
        {Object.keys(headers).map((headerKey, i) => (
          <StyledContainer
            key={i}
            borderTop={`2px dashed ${theme.palette.grey[300]}`}
            borderRadius="0"
            marginTop="16px"
            padding="24px 0 0"
          >
            <StyledInput
              label="Header Name"
              placeholder="Enter Header Name"
              value={headerKey}
              onChange={e => handleHeaderChange(e.target.value, headers[headerKey], headerKey)}
            />
            <StyledInput
              label="Header Value"
              placeholder="Enter Header Value"
              value={headers[headerKey]}
              onChange={e => handleHeaderChange(headerKey, e.target.value)}
            />
          </StyledContainer>
        ))}
        <StyledContainer flexDirection="row" alignItems="center" sx={{ cursor: 'pointer' }} onClick={handleAddHeader}>
          <AddCircleOutlineIcon color="primary" />
          <StyledText text="Add Header" color={theme.palette.primary.main} type="bodyBold" />
        </StyledContainer>
        <StyledText text={error} color={theme.palette.error.main} />
      </StyledContainer>
    </StyledDialog>
  );
};

export default WebhookDialog;