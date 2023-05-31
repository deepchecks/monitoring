import React, { useEffect, useState } from 'react';

import { useTheme } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import { StyledContainer, StyledDialog, StyledInput, StyledText } from 'components/lib';

import {
  StandardWebhookProperties,
  createWebhookApiV1AlertWebhooksPost,
  listWebhooksApiV1AlertWebhooksGet,
  updateWebhookApiV1AlertWebhooksWebhookIdPut
} from 'api/generated';

import { resError } from 'helpers/types/resError';

interface WebhookDialogProps {
  open: boolean;
  isWebhookConnected: boolean | undefined;
  handleClose: () => void;
  refetch: () => void;
}

const WebhookDialog = ({ handleClose, open, isWebhookConnected, refetch }: WebhookDialogProps) => {
  const theme = useTheme();

  const [error, setError] = useState('');
  const [webhookId, setWebhookId] = useState(1);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [headers, setHeaders] = useState<{ [key: string]: any }>({ 'HEADER-NAME': 'Value' });

  const dialogTitleAndBtn = isWebhookConnected ? 'Edit Webhook' : 'Create New Webhook';

  const payload: StandardWebhookProperties = {
    kind: 'STANDARD',
    name: name,
    description: description,
    http_url: url,
    http_method: 'POST',
    http_headers: headers,
    notification_levels: []
  };

  const handleAddHeader = () =>
    headers['HEADER-NAME']
      ? setError('Please fill the existing header name input before adding a new one.')
      : setHeaders({ ...headers, 'HEADER-NAME': 'Value' });

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
    const response = isWebhookConnected
      ? await updateWebhookApiV1AlertWebhooksWebhookIdPut(webhookId, payload)
      : await createWebhookApiV1AlertWebhooksPost(payload);

    if ((response as unknown as resError)?.error_message) {
      setError((response as any).error_message);
    } else {
      refetch();
      handleClose();
    }
  };

  const handleEditInitValues = async () => {
    if (isWebhookConnected) {
      const res = await listWebhooksApiV1AlertWebhooksGet();

      if (res[0]) {
        setWebhookId(res[0].id);
        setUrl(res[0].http_url);
        setName(res[0].name);
        setDescription(res[0].description as string);
        setHeaders(res[0].http_headers as { [key: string]: any });
      }
    }
  };

  useEffect(() => void handleEditInitValues(), []);

  return (
    <StyledDialog
      open={open}
      title={dialogTitleAndBtn}
      closeDialog={handleClose}
      submitButtonLabel={dialogTitleAndBtn}
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
              label="Header Name (Cant be null / duplicated)"
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
