import { TextField, Typography, styled, Select, IconButton } from '@mui/material';

export const StyledLabel = styled(Typography)({
  fontWeight: 600,
  textAlign: 'left',
  marginBottom: '8px'
});

export const StyledTextfield = styled(TextField)(({ theme }) => ({
  '.MuiInputBase-root': {
    height: '52px',
    border: `1px solid ${theme.palette.grey.light}`,
    borderRadius: '5px',
    marginBottom: '20px'
  }
}));

export const StyledSelect = styled(Select)(({ theme }) => ({
  height: '52px',
  borderRadius: '5px',

  '& .MuiOutlinedInput-notchedOutline': {
    border: `1px solid ${theme.palette.grey.light}`
  }
}));

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
