import React from 'react';

import { Box, OutlinedInput, Input as MUIInput, InputLabel, InputProps as MUIInputProps, styled } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

const StyledLabel = styled(InputLabel)(({ theme }) => ({
  fontWeight: 700,
  fontSize: '12px',
  color: theme.palette.grey[400],
  marginBottom: '4px'
}));

const StyledOutlinedInput = styled(OutlinedInput)(({ theme }) => ({
  color: theme.palette.grey[400],
  '& input': { padding: '10px 12px' }
}));

const StyledSearchField = styled(MUIInput)(({ theme }) => ({
  fontWeight: 700,
  fontSize: '14px',
  color: theme.palette.grey[400],
  '& input': { padding: '10px 12px 10px 0' }
}));

interface InputProps extends MUIInputProps {
  value: string;
  onCloseIconClick?: () => void;
  searchField?: boolean;
  label?: string;
}

export const Input = (props: InputProps) => {
  const { value, onCloseIconClick, searchField, label, ...otherProps } = props;
  const id = label ? 'id ' + label : label;

  const CloseIconAdornment = (
    <CloseIcon onClick={onCloseIconClick} cursor="pointer" sx={{ width: '18px', height: '18px' }} />
  );

  return searchField ? (
    <>
      <StyledSearchField endAdornment={value ? CloseIconAdornment : <SearchIcon />} value={value} {...otherProps} />
    </>
  ) : (
    <Box>
      {label && <StyledLabel htmlFor={id}>{label}</StyledLabel>}
      <StyledOutlinedInput
        id={id}
        endAdornment={value && onCloseIconClick && CloseIconAdornment}
        value={value}
        fullWidth
        {...otherProps}
      />
    </Box>
  );
};
