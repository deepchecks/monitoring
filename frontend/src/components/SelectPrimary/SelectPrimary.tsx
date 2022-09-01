import React, { ReactNode } from 'react';
import { Select, SelectProps, FormControl, InputLabel } from '@mui/material';
import { styled } from '@mui/material';

export const StyledFormControl = styled(FormControl)({
  minWidth: 160
});

export const StyledInputLabel = styled(InputLabel)(({ theme }) => ({
  color: theme.palette.text.disabled
}));

interface SelectPrimaryProps extends SelectProps {
  children: ReactNode;
  label: string;
  fullWidth?: boolean;
}

const sizeMap = {
  small: 'small',
  medium: 'normal'
} as const;

export function SelectPrimary({ children, label, fullWidth = false, size, ...props }: SelectPrimaryProps) {
  return (
    <StyledFormControl fullWidth={fullWidth}>
      <StyledInputLabel size={size ? sizeMap[size] : sizeMap.medium}>{label}</StyledInputLabel>
      <Select size={size} label={label} {...props}>
        {children}
      </Select>
    </StyledFormControl>
  );
}
