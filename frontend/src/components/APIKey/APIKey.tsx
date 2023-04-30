import React, { useState } from 'react';

import { regenerateApiTokenApiV1UsersRegenerateApiTokenGet } from 'api/generated';

import { Alert, Snackbar } from '@mui/material';

import { StyledApiKey, StyledApiKeyContainer } from './APIKey.styles';

import { StyledButton, StyledText, StyledContainer } from 'components/lib';

import logger from 'helpers/services/logger';

import { constants } from './apikey.constants';

const { copied, copy, link, regenerate, text } = constants;

export function APIKey() {
  const [apiToken, setApiToken] = useState<string | undefined>();
  const [snackOpen, setSnackOpen] = useState(false);

  const regenerateApiToken = () => {
    regenerateApiTokenApiV1UsersRegenerateApiTokenGet().then(
      value => {
        setApiToken(value);
      },
      reason => {
        logger.info(reason);
      }
    );
  };

  const handleClick = () => {
    if (apiToken) {
      navigator.clipboard.writeText(apiToken);
      setSnackOpen(true);
    } else {
      regenerateApiToken();
    }
  };

  const closeSnackbar = () => setSnackOpen(false);

  return (
    <>
      <StyledContainer flexDirection="row">
        <StyledText text={text} />
        <a href="https://docs.deepchecks.com/stable/getting-started/welcome.html" target="_blank" rel="noreferrer">
          {link}
        </a>
      </StyledContainer>
      <StyledApiKeyContainer type="card">
        <StyledApiKeyContainer>
          <StyledApiKey text={apiToken || '*'.repeat(59)} />
          <StyledButton onClick={handleClick} label={apiToken ? copy : regenerate} />
        </StyledApiKeyContainer>
      </StyledApiKeyContainer>
      <Snackbar
        open={snackOpen}
        onClose={closeSnackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }} variant="filled">
          {copied}
        </Alert>
      </Snackbar>
    </>
  );
}
