import { styled, Box, Button, Typography } from '@mui/material';
import { colors } from 'theme/colors';

export const StyledContainer = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: '100px',
  width: '100%',
  marginBottom: '35px',
  padding: '20px 0',
  borderBottom: `1px dashed ${theme.palette.text.disabled}`
}));

export const StyledContentContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center'
});

export const StyledHeading = styled(Typography)({
  color: colors.neutral.lightText
});

export const StyledDivider = styled(Box)(({ theme }) => ({
  height: '42px',
  width: '1px',
  margin: '0 20px 0 30px',
  backgroundColor: theme.palette.grey[200]
}));

export const StyledButton = styled(Button)({
  padding: '11px 8px',
  color: colors.primary.violet[400],
  fontSize: '14px',
  lineHeight: '17px',
  fontWeight: 400,

  '& .MuiButton-startIcon': {
    marginRight: '4px'
  }
});
