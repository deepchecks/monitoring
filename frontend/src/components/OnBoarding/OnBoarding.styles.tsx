import { Stack, styled, Typography, TextField } from '@mui/material';

export const StyledInputsWrapper = styled(Stack)({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center'
});

export const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-input': {
    padding: '4px 8px',
    width: 85
  }
});

export const StyledLabel = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  lineHeight: 1.57,
  letterSpacing: '0.1px',
  marginBottom: '10px',
  color: theme.palette.text.disabled
}));
