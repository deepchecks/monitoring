import React, { ReactNode } from 'react';

import { TextFieldProps, SelectProps, InputLabel, FormControl, SxProps } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';

import { StyledIconButton, StyledLabel, StyledSelect, StyledTextfield } from './InputDropdown.styles';

type BaseInputProps = {
  inputLabel?: string;
} & TextFieldProps;

export const BaseInput = ({ inputLabel, ...props }: BaseInputProps) => (
  <FormControl fullWidth>
    {inputLabel && <StyledLabel>{inputLabel}</StyledLabel>}
    <StyledTextfield {...props} />
  </FormControl>
);

interface BaseDropdownProps extends SelectProps {
  children: ReactNode;
  inputLabel?: string;
  clearValue?: () => void;
  sx?: SxProps;
}

export const BaseDropdown = ({
  inputLabel,
  label,
  disabled,
  required,
  clearValue,
  sx,
  ...props
}: BaseDropdownProps) => {
  const handleClearClick = () => {
    if (clearValue) clearValue();
  };

  return (
    <FormControl fullWidth disabled={disabled} required={required} sx={sx}>
      {inputLabel && <StyledLabel>{inputLabel}</StyledLabel>}
      <InputLabel>{label}</InputLabel>
      <StyledSelect
        label={label}
        endAdornment={
          clearValue &&
          !disabled && (
            <StyledIconButton active={!!props.value} onClick={handleClearClick}>
              <ClearIcon />
            </StyledIconButton>
          )
        }
        {...props}
      />
    </FormControl>
  );
};
