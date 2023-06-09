import React, { ReactNode } from 'react';

import { TextFieldProps, SelectProps, InputLabel, FormControl } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';

import { StyledIconButton, StyledLabel, StyledSelect, StyledTextfield } from './BaseInput.styles';

type BaseInputProps = {
  label?: string;
} & TextFieldProps;

export const BaseInput = ({ label = '', ...props }: BaseInputProps) => (
  <>
    <StyledLabel>{label}</StyledLabel>
    <StyledTextfield fullWidth {...props} />
  </>
);

interface BaseDropdownProps extends SelectProps {
  children: ReactNode;
  inputLabel?: string;
  clearValue?: () => void;
}

export const BaseDropdown = ({ inputLabel, label, disabled, required, clearValue, ...props }: BaseDropdownProps) => {
  const handleClearClick = () => {
    if (clearValue) clearValue();
  };

  return (
    <FormControl fullWidth disabled={disabled} required={required}>
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
