import React, { ReactNode } from 'react';

import { TextField, Typography, styled, TextFieldProps, SelectProps, Select } from '@mui/material';

type MembersActionDialogInputProps = {
  label?: string;
} & TextFieldProps;

export const MembersActionDialogInput = ({ label = '', ...props }: MembersActionDialogInputProps) => (
  <>
    <StyledLabel>{label}</StyledLabel>
    <StyledTextfield fullWidth {...props} />
  </>
);

interface MembersActionDialogDropdownProps extends SelectProps {
  children: ReactNode;
}

export const MembersActionDialogDropdown = ({ label = '', ...props }: MembersActionDialogDropdownProps) => (
  <>
    <StyledLabel>{label}</StyledLabel>
    <StyledSelect fullWidth {...props} />
  </>
);

export const StyledLabel = styled(Typography)({
  fontWeight: 600,
  textAlign: 'left',
  marginBottom: '8px'
});

const StyledTextfield = styled(TextField)(({ theme }) => ({
  '.MuiInputBase-root': {
    height: '52px',
    border: `1px solid ${theme.palette.grey.light}`,
    borderRadius: '5px',
    marginBottom: '20px'
  }
}));

export const StyledSelect = styled(Select)(({ theme }) => ({
  height: '52px',
  borderRadius: '5px',

  '& .MuiOutlinedInput-notchedOutline': {
    border: `1px solid ${theme.palette.grey.light}`
  }
}));
