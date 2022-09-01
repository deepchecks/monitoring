import React, { memo } from 'react';
import { InputAdornment, TextField, TextFieldProps } from '@mui/material';
import { SearchIcon } from '../assets/icon/icon';

const SearchFieldComponent = (props: TextFieldProps) => (
  <TextField
    sx={{
      borderRadius: '4px'
    }}
    placeholder="Search Model"
    variant="outlined"
    {...props}
    InputProps={{
      endAdornment: (
        <InputAdornment
          position="end"
          sx={{
            cursor: 'pointer'
          }}
        >
          <SearchIcon />
        </InputAdornment>
      )
    }}
  />
);

export const SearchField = memo(SearchFieldComponent);
