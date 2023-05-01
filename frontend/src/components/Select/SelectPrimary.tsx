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
  MenuItem,
  styled
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

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
      <Select
        size={size}
        label={label}
        IconComponent={ArrowDropDownIcon}
        {...props}
        sx={theme => ({
          borderRadius: '5px',

          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.grey.light
          }
        })}
      >
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
