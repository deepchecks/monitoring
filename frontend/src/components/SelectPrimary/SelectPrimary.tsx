import React, { ReactNode } from 'react';
import pick from 'lodash/pick';
import {
  Select,
  SelectProps,
  FormControl,
  InputLabel,
  InputLabelProps,
  FormHelperText,
  FormHelperTextProps,
  MenuItem
} from '@mui/material';
import { styled } from '@mui/material';

export interface SelectPrimaryProps extends SelectProps {
  children: ReactNode;
  label: string;
  fullWidth?: boolean;
  labelProps?: InputLabelProps;
  helperText?: FormHelperTextProps['children'];
}

export const SelectPrimary = ({
  children,
  label,
  fullWidth = false,
  size,
  labelProps,
  helperText,
  ...props
}: SelectPrimaryProps) => {
  const helperTextProps = pick(props, ['error', 'required', 'disabled']);

  return (
    <StyledFormControl fullWidth={fullWidth}>
      <StyledInputLabel {...labelProps}>{label}</StyledInputLabel>
      <Select size={size} label={label} {...props}>
        {children}
      </Select>
      {helperText && <FormHelperText {...helperTextProps}>{helperText}</FormHelperText>}
    </StyledFormControl>
  );
};

export const SelectPrimaryItem = MenuItem;

export const StyledFormControl = styled(FormControl)({
  minWidth: 160
});

export const StyledInputLabel = styled(InputLabel)(({ theme }) => ({
  color: theme.palette.text.disabled
}));
