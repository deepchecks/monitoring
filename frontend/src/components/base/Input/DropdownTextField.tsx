import React from 'react';

import { styled, TextField, TextFieldProps } from '@mui/material';

import { DropdownArrowComponent } from '../../DropdownArrowComponent';

import { theme } from 'components/lib/theme';

type DropdownTextFieldProps = {
  isDropdownOpen?: boolean;
} & TextFieldProps;

export const DropdownTextField = ({ isDropdownOpen = false, ...props }: DropdownTextFieldProps) => (
  <StyledTextField
    variant="outlined"
    size="small"
    InputProps={{
      endAdornment: <DropdownArrowComponent isDropdownOpen={isDropdownOpen} />,
      readOnly: true
    }}
    {...props}
  />
);

export const StyledTextField = styled(TextField)({
  '.MuiInputBase-root, .MuiOutlinedInput-input': {
    cursor: 'pointer'
  },

  '.MuiOutlinedInput-root': {
    fontSize: '14px',
    fontWeight: 600,
    paddingRight: 8,
    borderRadius: '10px',

    '& fieldset': {
      borderColor: theme.palette.grey.light
    },

    '& svg': {
      color: 'rgba(0, 0, 0, 0.54)'
    }
  }
});
