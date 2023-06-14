import React, { useEffect, useState } from 'react';

import { useTheme } from '@mui/material';
import { RemoveCircleOutlineOutlined, AddCircleOutlineOutlined } from '@mui/icons-material';

import { StyledContainer, StyledDialog, StyledInput, StyledText } from 'components/lib';

import {
  StandardWebhookProperties,
  createWebhookApiV1AlertWebhooksPost,
  listWebhooksApiV1AlertWebhooksGet,
  updateWebhookApiV1AlertWebhooksWebhookIdPut
} from 'api/generated';

import { resError } from 'helpers/types/resError';
import { convertArrayToDictionary, convertDictionaryToArray } from 'helpers/utils/arrDictConverter';

interface WebhookDialogProps {
  open: boolean;
  isWebhookConnected: boolean | undefined;
  handleClose: () => void;
  refetch: () => void;
}

const WebhookDialog = ({ handleClose, open, isWebhookConnected, refetch }: WebhookDialogProps) => {
  const theme = useTheme();

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [webhookId, setWebhookId] = useState(1);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST'>('POST');
  const [headers, setHeaders] = useState([{ name: '', value: '' }]);

  const dialogTitleAndBtn = isWebhookConnected ? 'Edit Webhook' : 'Create New Webhook';

  const payload: StandardWebhookProperties = {
    kind: 'STANDARD',
    name: name,
    description: description,
    http_url: url,
    http_method: httpMethod,
    http_headers: convertArrayToDictionary(headers),
    notification_levels: []
  };

  const handleAddHeader = () => setHeaders([...headers, { name: '', value: '' }]);
  const handleRemoveHeader = () => {
    setHeaders(prevHeaders => {
      const newHeaders = prevHeaders.slice(0, -1);
      return newHeaders;
    });
  };

  const handleHeaderChange = (i: number, value: string, isValue?: boolean) => {
    setHeaders(prevHeaders => {
      const updatedHeaders = [...prevHeaders];
      if (isValue) {
        updatedHeaders[i] = { ...updatedHeaders[i], value };
      } else {
        updatedHeaders[i] = { ...updatedHeaders[i], name: value };
      }
      return updatedHeaders;
    });
  };

  const handleSubmitWebhookForm = async () => {
    setIsLoading(true);
    const response = isWebhookConnected
      ? await updateWebhookApiV1AlertWebhooksWebhookIdPut(webhookId, payload)
      : await createWebhookApiV1AlertWebhooksPost(payload);

    if ((response as unknown as resError)?.error_message) {
      setError((response as any).error_message);
      setIsLoading(false);
    } else {
      refetch();
      setError('');
      setIsLoading(false);
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
        setHttpMethod(res[0].http_method);
        setHeaders(convertDictionaryToArray(res[0].http_headers));
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
      submitButtonWidth="150px"
      isLoading={isLoading}
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
          placeholder="Enter Http Method (GET/POST)"
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
        {headers.map((header, i) => (
          <StyledContainer
            key={i}
            borderTop={`2px dashed ${theme.palette.grey[300]}`}
            borderRadius="0"
            marginTop="16px"
            padding="24px 0 0"
          >
            <StyledInput
              label="Header Name (Can't be null / duplicated)"
              placeholder="Enter Header Name"
              value={header.name}
              onChange={e => handleHeaderChange(i, e.target.value)}
            />
            <StyledInput
              label="Header Value"
              placeholder="Enter Header Value"
              value={header.value}
              onChange={e => handleHeaderChange(i, e.target.value, true)}
            />
          </StyledContainer>
        ))}
        <StyledContainer flexDirection="row" alignItems="center" justifyContent="space-between" padding="8px 0">
          <StyledContainer
            flexDirection="row"
            alignItems="center"
            sx={{ cursor: 'pointer', padding: 0 }}
            onClick={handleAddHeader}
          >
            <AddCircleOutlineOutlined color="primary" />
            <StyledText text="Add Header" color={theme.palette.primary.main} type="bodyBold" />
          </StyledContainer>
          <StyledContainer
            flexDirection="row"
            alignItems="center"
            sx={{ cursor: 'pointer', padding: 0, width: '220px' }}
            onClick={handleRemoveHeader}
          >
            <RemoveCircleOutlineOutlined color="primary" />
            <StyledText text="Remove Header" color={theme.palette.primary.main} type="bodyBold" />
          </StyledContainer>
        </StyledContainer>
        <StyledText text={error} color={theme.palette.error.main} />
      </StyledContainer>
    </StyledDialog>
  );
};

export default WebhookDialog;
