import { FormControl, SelectProps } from '@mui/material';
import { ReactNode } from 'react';

import { InputLabel, Select, styled } from '@mui/material';

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
}

const sizeMap = {
  small: 'small',
  medium: 'normal'
} as const;

export function MarkedSelect({ children, label, fullWidth = false, size, ...props }: MarkedSelectProps) {
  return (
    <FormControl fullWidth={fullWidth}>
      <StyledInputLabel size={size ? sizeMap[size] : sizeMap.medium}>{label}</StyledInputLabel>
      <StyledSelect size={size} label={label} {...props}>
        {children}
      </StyledSelect>
    </FormControl>
  );
}
