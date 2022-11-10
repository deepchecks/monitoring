import React, { ReactNode } from 'react';

import { styled, FormControl, IconButton, SelectProps, InputLabel, Select } from '@mui/material';

import { Clear } from 'assets/icon/icon';

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

export function MarkedSelect({
  children,
  label,
  fullWidth = false,
  size,
  clearValue,
  disabled,
  ...props
}: MarkedSelectProps) {
  const handleClearClick = () => {
    if (clearValue) {
      clearValue();
    }
  };

  return (
    <FormControl fullWidth={fullWidth} disabled={disabled}>
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

export const StyledInputLabel = styled(InputLabel)(({ theme }) => ({
  color: theme.palette.text.disabled
}));

export const StyledSelect = styled(Select)({
  minWidth: 200
});
