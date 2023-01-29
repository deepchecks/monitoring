import React, { ReactNode, memo } from 'react';

import { styled, FormControl, IconButton, SelectProps, InputLabel, Select, FormHelperText } from '@mui/material';

import { Clear } from 'assets/icon/icon';

interface MarkedSelectProps extends SelectProps {
  children: ReactNode;
  fullWidth?: boolean;
  clearValue?: () => void;
  formHelper?: [string, object];
  width?: StyledSelectWidth;
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
  width,
  ...props
}: MarkedSelectProps) {
  const handleClearClick = () => {
    if (clearValue) clearValue();
  };

  return (
    <FormControl fullWidth={fullWidth} disabled={disabled}>
      <StyledInputLabel size={sizeMap[size]}>{label}</StyledInputLabel>
      <StyledSelect
        width={width}
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

interface StyledSelectWidth {
  xs: number | null;
  xl: number | null;
}

interface StyledSelectProps {
  width?: StyledSelectWidth;
}

export const StyledSelect = styled(Select, { shouldForwardProp: prop => prop !== 'width' })<StyledSelectProps>(
  ({ width }) => ({
    minWidth: 200,
    '@media (max-width: 1536px)': {
      minWidth: 100,
      width: width ? width.xs : '100%',
      height: '36px'
    },
    '& .MuiSelect-select': {
      '@media (max-width: 1536px)': {
        fontSize: '12px'
      }
    }
  })
);

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
