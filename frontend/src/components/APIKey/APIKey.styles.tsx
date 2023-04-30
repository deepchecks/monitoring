import { styled } from '@mui/material';

import { StyledContainer, StyledText } from 'components/lib';

const StyledApiKeyContainer = styled(StyledContainer)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  width: '100%',
  maxWidth: '900px',
  padding: '20px',
  borderRadius: '16px',
  border: `1px solid ${theme.palette.grey.light}`
}));

const StyledApiKey = styled(StyledText)({
  fontWeight: 700,
  fontSize: '24px',
  lineHeight: '140%',
  display: 'flex',
  flexGrow: 1,
  wordBreak: 'break-all'
});

export { StyledApiKey, StyledApiKeyContainer };
