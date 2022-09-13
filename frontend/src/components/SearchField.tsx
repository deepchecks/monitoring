import React, { memo } from 'react';
import { InputAdornment, TextField, TextFieldProps } from '@mui/material';
import { SearchIcon } from '../assets/icon/icon';

const SearchFieldComponent = (props: TextFieldProps) => {
  const { onChange } = props;
  return (
    <TextField
      onChange={onChange}
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
};

export const SearchField = memo(SearchFieldComponent);
