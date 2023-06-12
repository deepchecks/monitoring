import React, { useState } from 'react';

import { useTheme } from '@mui/material';

import { StyledButton, StyledContainer, StyledText } from 'components/lib';

const constants = {
  title: 'Generate API Token (Colab)',
  description: 'Our tokens are valid until you are generating a new one. \nClick here to get your token.',
  buttonLabel: 'Generate and copy',
  buttonCopiedLabel: 'Copied!'
};

interface GenerateTokenProps {
  regenerateApiToken: () => void;
}

const GenerateToken = ({ regenerateApiToken }: GenerateTokenProps) => {
  const theme = useTheme();
  const [copiedApiToken, setCopiedApiToken] = useState(false);

  const buttonLabel = copiedApiToken ? constants.buttonCopiedLabel : constants.buttonLabel;

  const handleButtonClick = () => {
    regenerateApiToken();
    setCopiedApiToken(true);
  };

  return (
    <StyledContainer
      background="rgba(121, 100, 255, 0.2)"
      width="280px"
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
