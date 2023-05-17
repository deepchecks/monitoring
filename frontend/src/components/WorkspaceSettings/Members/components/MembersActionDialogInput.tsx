import React from 'react';

import { TextField, Typography, styled, TextFieldProps } from '@mui/material';

type MembersActionDialogInputProps = {
  label?: string;
} & TextFieldProps;

export const MembersActionDialogInput = ({ label = '', ...props }: MembersActionDialogInputProps) => (
  <>
    <StyledLabel>{label}</StyledLabel>
    <StyledTextfield fullWidth {...props} />
  </>
);

const StyledLabel = styled(Typography)({
  fontWeight: 600,
  textAlign: 'left',
  marginBottom: '8px'
});

const StyledTextfield = styled(TextField)(({ theme }) => ({
  '.MuiInputBase-root': {
    height: '52px',
    border: `1px solid ${theme.palette.grey.light}`,
    borderRadius: '5px'
  }
}));
