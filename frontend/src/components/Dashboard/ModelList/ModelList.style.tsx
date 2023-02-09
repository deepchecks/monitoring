import { styled, Box, List, Typography, Stack } from '@mui/material';
import { colors } from 'theme/colors';

export const StyledContainer = styled(Box)({
  overflow: 'hidden',
  height: '502px',
  border: `1px solid ${colors.neutral.grey.light}`,
  borderRadius: '10px',

  '@media (max-width: 1536px)': {
    height: '370px'
  }
});

export const StyledHeadingContainer = styled(Stack)({
  flexDirection: 'row',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  padding: '32px 24px',

  '@media (max-width: 1536px)': {
    padding: '20px 16px'
  }
});

export const StyledHeading = styled(Typography)({
  fontSize: 20,
  fontWeight: 700,
  lineHeight: '20px',
  textAlign: 'left',
  color: colors.neutral.darkText
});

export const StyledSearchFieldContainer = styled(Box)({
  padding: '0 20px 4px 20px',

  '@media (max-width: 1536px)': {
    padding: '0 10px 10px 10px'
  }
});

export const StyledList = styled(List)({
  overflow: 'overlay',
  scrollbarWidth: 'thin',
  height: '373px',
  padding: 0,

  '@media (max-width: 1536px)': {
    height: '259px'
  }
});

const StyledStack = styled(Stack)({
  flexDirection: 'row',
  alignItems: 'center'
});

export const StyledResetSelectionContainer = styled(StyledStack)({
  position: 'sticky',
  bottom: 0,
  height: '50px',
  padding: '0 24px',
  background: colors.neutral.white,
  borderTop: `1px solid ${colors.neutral.grey.light}`,
  backdropFilter: 'blur(5px)',

  '@media (max-width: 1536px)': {
    height: '42px',
    padding: '0 16px'
  }
});

export const StyledResetSelectionContent = styled(StyledStack)({
  cursor: 'pointer',
  transition: 'opacity 0.3s ease',

  '&:hover': {
    opacity: 0.5
  }
});

export const StyledResetSelectionText = styled(Typography)({
  fontWeight: 600,
  fontSize: '14px',
  lineHeight: '17px',
  marginLeft: '16px',
  color: colors.primary.violet[400]
});
