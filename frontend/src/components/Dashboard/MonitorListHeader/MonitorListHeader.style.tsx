import { styled, Typography, Stack, Button } from '@mui/material';

export const StyledContainer = styled(Stack)({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between'
});

export const StyledHeading = styled(Typography)({
  fontWeight: 700,
  fontSize: '20px',
  lineHeight: '18px'
});

export const StyledButton = styled(Button)({
  minWidth: '32px',
  width: '32px',
  minHeight: '32px',
  height: '32px',
  borderRadius: '5px',
  padding: 0
});
