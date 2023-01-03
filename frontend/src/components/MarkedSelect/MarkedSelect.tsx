import React, { ReactNode, memo } from 'react';

import { styled, FormControl, IconButton, SelectProps, InputLabel, Select } from '@mui/material';

import { Clear } from 'assets/icon/icon';

interface MarkedSelectProps extends SelectProps {
  children: ReactNode;
  fullWidth?: boolean;
  clearValue?: () => void;
}

const sizeMap = {
  small: 'small',
  medium: 'normal'
} as const;

function MarkedSelectComponent({
  children,
  label,
  fullWidth = false,
  size = 'small',
  clearValue,
  disabled,
  ...props
}: MarkedSelectProps) {
  const handleClearClick = () => {
    if (clearValue) clearValue();
  };

  return (
    <FormControl fullWidth={fullWidth} disabled={disabled}>
      <StyledInputLabel size={sizeMap[size]}>{label}</StyledInputLabel>
      <StyledSelect
        size={size}
        label={label}
        endAdornment={
          clearValue && !disabled ? (
            <StyledIconButton active={!!props.value} onClick={handleClearClick}>
              <Clear />
            </StyledIconButton>
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

interface StyledIconButtonProps {
  active: boolean;
}

const StyledIconButton = styled(IconButton, { shouldForwardProp: prop => prop !== 'active' })<StyledIconButtonProps>(
  ({ active }) => ({
    visibility: active ? 'visible' : 'hidden',
    display: active ? 'auto' : 'none',
    background: 'transparent',
    marginRight: '12px',
    padding: 0,

    '&:hover': {
      background: 'transparent'
    }
  })
);

export const MarkedSelect = memo(MarkedSelectComponent);
