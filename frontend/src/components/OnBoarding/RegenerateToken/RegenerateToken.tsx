import React, { useState } from 'react';
import { useTheme } from '@mui/material';

import { regenerateApiTokenApiV1UsersRegenerateApiTokenGet } from 'api/generated';

import { StyledButton, StyledContainer, StyledText } from 'components/lib';

const RegenerateToken = () => {
  const theme = useTheme();
  const [apiToken, setApiToken] = useState('');

  const regenerateApiToken = async () => {
    regenerateApiTokenApiV1UsersRegenerateApiTokenGet().then(value => {
      if (value) {
        setApiToken(value);
        navigator.clipboard.writeText(value);
      }
    });
  };

  return (
    <StyledContainer
      background="rgba(121, 100, 255, 0.2);"
      width="280px"
      height="195px"
      border="1px solid #7964FF"
      borderRadius="16px"
      padding="24px"
      marginLeft="800px"
      position="absolute"
    >
      <StyledText text="Your API token has timed out" color={theme.palette.primary.main} type="h3" />
      <StyledText
        text="Our tokens are valid for limited hours, and this one has expired. Click here to get a new one."
        color={theme.palette.grey[500]}
        margin="4px 0 auto"
      />
      <StyledButton label={!apiToken ? 'Regenerate and copy' : 'Copied !'} onClick={regenerateApiToken} />
    </StyledContainer>
  );
};

export default RegenerateToken;
