import { Box, Button, IconButton, Modal, styled, TextField, Typography } from '@mui/material';

export const StyledModal = styled(Modal)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
});

export const StyledBox = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  width: '500px',
  height: '370px',
  padding: '20px 30px 30px',
  backgroundColor: 'white'
});

export const StyledHeader = styled(Box)({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: '15px'
});

export const StyledTitle = styled(Typography)({
  fontWeight: '700',
  fontSize: '24px'
});

export const StyledDescription = styled(Typography)({
  fontWeight: '400',
  fontSize: '16px',
  marginBottom: 0
});

export const StyledCloseModalButton = styled(IconButton)({
  width: '30px',
  position: 'absolute',
  top: 0,
  right: '-10px',
  backgroundColor: 'transparent'
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

export const StyledSubmitButton = styled(Button)({
  marginTop: '22px',
  alignSelf: 'end'
});
