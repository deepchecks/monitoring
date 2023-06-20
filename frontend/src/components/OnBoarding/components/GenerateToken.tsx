import React, { useState } from 'react';

import { useTheme } from '@mui/material';

import { StyledButton, StyledContainer, StyledText } from 'components/lib';

const constants = {
  title: 'Generate API Token',
  description: 'Your token is valid until you generate a new one. \nClick here to get new token.',
  buttonLabel: 'Generate and copy',
  buttonCopiedLabel: 'Copied!'
};

interface GenerateTokenProps {
  regenerateApiToken: () => void;
  isLocal: boolean;
  apiToken: string;
}

const GenerateToken = ({ regenerateApiToken, isLocal, apiToken }: GenerateTokenProps) => {
  const theme = useTheme();
  const [copiedApiToken, setCopiedApiToken] = useState(false);

  const buttonLabel = copiedApiToken ? constants.buttonCopiedLabel : constants.buttonLabel;
  const hideTokenGeneration = apiToken !== 'API_TOKEN' && isLocal;

  const handleButtonClick = () => {
    regenerateApiToken();
    setCopiedApiToken(true);
  };

  if (hideTokenGeneration) {
    return <div />;
  }

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
      <StyledButton label={buttonLabel} onClick={handleButtonClick} disabled={copiedApiToken} />
    </StyledContainer>
  );
};

export default GenerateToken;
