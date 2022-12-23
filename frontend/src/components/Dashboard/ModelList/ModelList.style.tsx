import { styled, Box, List, Typography } from '@mui/material';
import { colors } from 'theme/colors';

export const StyledContainer = styled(Box)({
  boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)',
  borderRadius: '10px',
  borderLeft: '8px solid rgba(239, 76, 54, 0.5)',
  minHeight: '100%'
});

export const StyledHeading = styled(Typography)({
  fontSize: 20,
  fontWeight: 500,
  lineHeight: '160%',
  textAlign: 'left',
  color: colors.neutral.darkText,
  padding: '21px 0 12px 22px'
});

export const StyledSearchFieldContainer = styled(Box)({
  padding: '20px 30px 20px 22px'
});

export const StyledList = styled(List)({
  height: '370px',
  overflowY: 'auto'
});
