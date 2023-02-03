import { Box, Select, styled, Typography } from '@mui/material';
import { colors } from 'theme/colors';

export const StyledContainer = styled(Box)({
  height: '566px',
  padding: '24px 32px',
  borderRadius: '10px',
  border: `1px solid ${colors.neutral.grey.light}`,

  '@media (max-width: 1536px)': {
    height: '328px'
  }
});

export const StyledHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '23px'
});

export const StyledTitle = styled(Typography)({
  color: colors.neutral.darkText,
  fontWeight: 700,
  fontSize: 20,
  lineHeight: '18px',
  textAlign: 'left'
});

export const StyledSelect = styled(Select)({
  fontWeight: 600,
  minWidth: 150,
  color: colors.neutral.darkText,
  borderRadius: '10px',

  '& .MuiSelect-icon': {
    '& + .MuiOutlinedInput-notchedOutline': {
      border: `1px solid ${colors.neutral.grey.light}`
    }
  }
});

export const StyledModel = styled(Box)({
  display: 'flex',
  alignItems: 'center'
});

interface StyledGraphColorProps {
  graphColor: string;
}

export const StyledGraphColor = styled(Box)<StyledGraphColorProps>(({ graphColor }) => ({
  width: 9,
  height: 9,
  borderRadius: '3px',
  backgroundColor: graphColor,
  marginRight: '6px'
}));

export const StyledLoaderBox = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
});
