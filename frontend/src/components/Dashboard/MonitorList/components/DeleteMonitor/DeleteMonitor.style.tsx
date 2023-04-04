import { Button, styled, Stack, Typography } from '@mui/material';

export const StyledContainer = styled(Stack)({
  width: '500px',
  padding: '19px 18px 30px 30px'
});

export const StyledHeading = styled(Typography)({
  fontWeight: 700,
  flexGrow: 1
});

export const StyledText = styled(Typography)({
  maxWidth: '423px',
  padding: '36.5px 0 61.5px'
});

export const StyledActionButton = styled(Button)({
  ':first-of-type': {
    marginRight: '20px'
  },

  fontSize: '14px',
  fontWeight: 500,
  lineHeight: '22px',
  letterSpacing: '1px',
  padding: '0 14px'
});
