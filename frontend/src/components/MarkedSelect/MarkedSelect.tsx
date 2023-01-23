import React, { ReactNode, memo } from 'react';

import { styled, FormControl, IconButton, SelectProps, InputLabel, Select, FormHelperText } from '@mui/material';

import { Clear } from 'assets/icon/icon';

interface MarkedSelectProps extends SelectProps {
  children: ReactNode;
  fullWidth?: boolean;
  clearValue?: () => void;
  formHelper?: [string, object];
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
  formHelper,
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
      {formHelper !== undefined && <FormHelperText sx={formHelper[1]}>{formHelper[0]}</FormHelperText>}
    </FormControl>
  );
}

export const StyledInputLabel = styled(InputLabel)(({ theme }) => ({
  color: theme.palette.text.disabled
}));

export const StyledSelect = styled(Select)({
  minWidth: 200,
  '@media (max-width: 1536px)': {
    minWidth: 100,
    width: 147,
    fontSize: '12px',
    height: '40px'
  }
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
