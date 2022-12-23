import { Box, Button, Stack, styled, Typography } from '@mui/material';

export const StyledStackContainer = styled(Stack)({
  padding: '32px 40px 0',
  height: '100%',
  justifyContent: 'space-between',
  overflowY: 'auto'
});

export const StyledStackInputs = styled(Stack)({
  width: 320
});

export const StyledTypography = styled(Typography)({
  textAlign: 'center',
  marginBottom: '35px'
});

export const StyledButtonWrapper = styled(Box)({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  position: 'sticky',
  bottom: 0,
  background: '#fff',
  minHeight: 84,
  paddingTop: 15,
  zIndex: 999
});

export const StyledButton = styled(Button)({
  width: 143
});

export const StyledTypographyLabel = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  lineHeight: 1.57,
  letterSpacing: '0.1px',
  marginBottom: '10px',
  color: theme.palette.text.disabled
}));
