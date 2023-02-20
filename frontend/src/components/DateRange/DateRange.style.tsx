import { Box, styled } from '@mui/material';

import { colors } from 'theme/colors';

export const StyledButtonContainer = styled(Box)({
  padding: '10px 0',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderTop: colors.neutral.grey.light
});
