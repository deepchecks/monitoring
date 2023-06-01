import { Box, Modal, styled, TextField, Typography } from '@mui/material';

export const StyledModal = styled(Modal)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
});

export const StyledDescription = styled(Typography)({
  fontWeight: '400',
  fontSize: '16px',
  marginBottom: 0
});

export const StyledForm = styled(Box)({
  display: 'flex',
  flexDirection: 'column'
});

export const StyledTextField = styled(TextField)({
  '& fieldset': {
    borderRadius: '3px 3px 0 0'
  }
});

export const StyledUploadArea = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  height: '40px',
  borderRadius: '0 0 3px 3px',
  border: 'solid 1px #bbb',
  borderTop: 'none'
});
