import { styled, Typography, Stack, Button, Box } from '@mui/material';
import { colors } from 'theme/colors';

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
  borderTop: `1px solid ${colors.neutral.grey.light}`
});

export const StyledButton = styled(Button)({
  fontWeight: 600,
  minHeight: '42px',
  borderRadius: '5px'
});
