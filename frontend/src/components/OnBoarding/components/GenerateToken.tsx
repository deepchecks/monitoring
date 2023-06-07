import React, { useState } from 'react';

import { useTheme } from '@mui/material';

import { regenerateApiTokenApiV1UsersRegenerateApiTokenGet } from 'api/generated';

import { StyledButton, StyledContainer, StyledText } from 'components/lib';

const constants = {
  title: 'Generate API Token',
  description: 'Our tokens are valid until you are generating a new one. \nClick here to get your token.',
  buttonLabel: 'Generate and copy',
  buttonCopiedLabel: 'Copied!'
};

const GenerateToken = () => {
  const theme = useTheme();
  const [apiToken, setApiToken] = useState('');

  const buttonLabel = apiToken ? constants.buttonCopiedLabel : constants.buttonLabel;

  const handleGenerateApiToken = async () => {
    regenerateApiTokenApiV1UsersRegenerateApiTokenGet().then(value => {
      setApiToken(value);
      navigator.clipboard.writeText(value);
    });
  };

  return (
    <StyledContainer
      background="rgba(121, 100, 255, 0.2)"
      width="240px"
      height="194px"
      border={`1px solid ${theme.palette.primary.main}`}
      gap="12px"
      padding="24px"
      textAlign="center"
    >
      <StyledText type="h3" text={constants.title} fontWeight={700} color={theme.palette.primary.main} />
      <StyledText text={constants.description} />
      <StyledButton label={buttonLabel} onClick={handleGenerateApiToken} />
    </StyledContainer>
  );
};

export default GenerateToken;
