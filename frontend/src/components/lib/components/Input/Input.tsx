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
  setValue: React.Dispatch<React.SetStateAction<string>>;
  searchField?: boolean;
  label?: string;
}

export const Input = (props: InputProps) => {
  const { value, setValue, searchField, label, ...otherProps } = props;
  const id = label ? 'id ' + label : label;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };

  const CloseIconAdornment = <CloseIcon onClick={() => setValue('')} cursor="pointer" />;

  return searchField ? (
    <>
      <StyledSearchField
        endAdornment={value ? CloseIconAdornment : <SearchIcon />}
        value={value}
        onChange={handleChange}
        {...otherProps}
      />
    </>
  ) : (
    <Box>
      {label && <StyledLabel htmlFor={id}>{label}</StyledLabel>}
      <StyledOutlinedInput
        id={id}
        endAdornment={value && CloseIconAdornment}
        value={value}
        onChange={handleChange}
        fullWidth
        {...otherProps}
      />
    </Box>
  );
};
