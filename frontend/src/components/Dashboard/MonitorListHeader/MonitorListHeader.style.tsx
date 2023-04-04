import { styled, Typography, Stack, Button, Box } from '@mui/material';

import { theme } from 'theme';

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

export const StyledLine = styled(Box)({
  flex: 1,
  margin: '0 24px',
  borderTop: `1px solid ${theme.palette.grey.light}`
});

export const StyledButton = styled(Button)({
  fontWeight: 600,
  minHeight: '42px',
  borderRadius: '5px',

  '@media (max-width: 1536px)': {
    fontSize: '12px',
    minHeight: '32px',

    '& svg': {
      width: 14,
      height: 14
    }
  }
});
