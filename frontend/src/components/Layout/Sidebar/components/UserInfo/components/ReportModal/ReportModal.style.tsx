import { Box, IconButton, Modal, styled, TextField, Typography } from '@mui/material';

export const StyledModal = styled(Modal)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
});

export const StyledDescription = styled(Typography)({
  fontWeight: '400',
  fontSize: '16px',
  marginBottom: '5px'
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

export const StyledPreviewContainer = styled(Box)({
  marginTop: '10px',
  position: 'relative'
});

export const StyledIconButton = styled(IconButton)({
  position: 'absolute',
  top: 0,
  left: '12.3%'
});
