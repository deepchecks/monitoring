import { TextField, Typography, styled, Select, IconButton } from '@mui/material';

export const StyledLabel = styled(Typography)({
  fontWeight: 600,
  textAlign: 'left',
  marginBottom: '8px'
});

export const StyledTextfield = styled(TextField)({
  '.MuiInputBase-root': {
    height: '52px',
    borderRadius: '5px'
  }
});

export const StyledSelect = styled(Select)({
  height: '52px',
  borderRadius: '5px'
});

interface StyledIconButtonProps {
  active: boolean;
}

export const StyledIconButton = styled(IconButton, {
  shouldForwardProp: prop => prop !== 'active'
})<StyledIconButtonProps>(({ active }) => ({
  visibility: active ? 'visible' : 'hidden',
  display: active ? 'auto' : 'none',
  transform: 'translateX(-5px)',
  transition: 'opacity 0.3s',

  '&:hover': {
    background: 'transparent',
    opacity: 0.5
  }
}));
