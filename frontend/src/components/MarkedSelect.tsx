import { FormControl, IconButton, SelectProps } from '@mui/material';
import React, { ReactNode } from 'react';

import { InputLabel, Select, styled } from '@mui/material';
import { Clear } from 'assets/icon/icon';

export const StyledInputLabel = styled(InputLabel)(({ theme }) => ({
  color: theme.palette.text.disabled
}));

export const StyledSelect = styled(Select)({
  minWidth: 200
});

interface MarkedSelectProps extends SelectProps {
  children: ReactNode;
  label: string;
  fullWidth?: boolean;
  clearValue?: () => void;
}

const sizeMap = {
  small: 'small',
  medium: 'normal'
} as const;

export function MarkedSelect({ children, label, fullWidth = false, size, clearValue, ...props }: MarkedSelectProps) {
  const handleClearClick = () => {
    if (clearValue) {
      clearValue();
    }
  };

  return (
    <FormControl fullWidth={fullWidth}>
      <StyledInputLabel size={size ? sizeMap[size] : sizeMap.medium}>{label}</StyledInputLabel>
      <StyledSelect
        size={size}
        label={label}
        endAdornment={
          clearValue ? (
            <IconButton
              sx={{
                visibility: props.value ? 'visible' : 'hidden',
                display: props.value ? 'auto' : 'none',
                background: 'transparent',
                mr: 2,
                p: 0,
                '&:hover': {
                  background: 'transparent'
                }
              }}
              onClick={handleClearClick}
            >
              <Clear />
            </IconButton>
          ) : null
        }
        {...props}
      >
        {children}
      </StyledSelect>
    </FormControl>
  );
}
