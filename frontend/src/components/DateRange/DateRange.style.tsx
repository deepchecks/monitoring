import { Box, styled } from '@mui/material';
import { theme } from 'components/lib/theme';

export const StyledButtonContainer = styled(Box)({
  padding: '10px 0',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderTop: theme.palette.grey.light
});
