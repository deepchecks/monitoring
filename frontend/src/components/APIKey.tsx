import React, { useState } from 'react';

import { regenerateApiTokenApiV1UsersRegenerateApiTokenGet } from 'api/generated';

import { Box, Button, Typography } from '@mui/material';
import logger from 'helpers/services/logger';

export function APIKey() {
  const [apiToken, setApiToken] = useState<string | undefined>(undefined);

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

  return (
    <Box>
      <Typography>
        The API key will allow you to insert, update, and access the data through the Deepchecks SDK. Please refer to
        the documentation __here__
      </Typography>

      <Box
        sx={{
          border: 1,
          borderRadius: '5px',
          borderColor: '#A2ABB3',
          backgroundColor: '#F9FBF',
          width: '660px',
          height: '128px',
          mt: 10,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '24px',
            lineHeight: '140%',
            display: 'flex',
            flexGrow: 1,
            ml: '10px',
            wordBreak: 'break-all'
          }}
        >
          {apiToken ? apiToken : '*********************'}
        </Typography>
        <Button
          sx={{
            display: 'flex',
            height: '42px',
            mr: '10px',
            borderRadius: '2px'
          }}
          onClick={regenerateApiToken}
        >
          Regenerate
        </Button>
      </Box>
      {apiToken ? (
        <Typography
          sx={{
            fontWeight: 400,
            fontSize: '14px',
            color: '#94A4AD'
          }}
        >
          The API Token appears only once. Make sure you copy and save it in a safe location!
        </Typography>
      ) : (
        ''
      )}
    </Box>
  );
}
