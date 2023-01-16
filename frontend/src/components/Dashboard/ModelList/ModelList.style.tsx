import { styled, Box, List, Typography } from '@mui/material';
import { colors } from 'theme/colors';

export const StyledContainer = styled(Box)({
  boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)',
  borderRadius: '10px',
  borderLeft: '8px solid rgba(239, 76, 54, 0.5)',
  overflow: 'hidden',
  height: '558px',
  '@media (max-width: 1536px)': {
    height: '328px'
  }
});

export const StyledHeading = styled(Typography)({
  fontSize: 20,
  fontWeight: 500,
  lineHeight: '160%',
  textAlign: 'left',
  color: colors.neutral.darkText,
  padding: '20px 0 12px 20px',
  '@media (max-width: 1536px)': {
    padding: '10px 0 0 12px'
  }
});

export const StyledSearchFieldContainer = styled(Box)({
  padding: '20px 30px 32px 20px',
  '@media (max-width: 1536px)': {
    padding: '10px 18px 10px 12px'
  }
});

export const StyledList = styled(List)({
  overflowY: 'scroll',
  height: '410px',
  '@media (max-width: 1536px)': {
    height: '225px'
  }
});
