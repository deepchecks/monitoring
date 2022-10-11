import { InputAdornment, TextField, TextFieldProps, Typography } from '@mui/material';
import React, { memo } from 'react';
import { SearchIcon } from '../assets/icon/icon';

type SearchFieldComponentProps = {
  reset: () => void;
};

const SearchFieldComponent = ({ reset, ...props }: SearchFieldComponentProps & TextFieldProps) => {
  const { onChange, value } = props;

  return (
    <TextField
      onChange={onChange}
      sx={{
        borderRadius: '4px'
      }}
      placeholder="Search Model"
      variant="outlined"
      value={value}
      {...props}
      InputProps={{
        endAdornment: !value ? (
          <InputAdornment
            position="end"
            sx={{
              cursor: 'pointer'
            }}
          >
            <SearchIcon />
          </InputAdornment>
        ) : (
          <InputAdornment
            position="end"
            sx={{
              cursor: 'pointer'
            }}
            onClick={reset}
          >
            <Typography variant="subtitle2" color="primary.main">
              Reset
            </Typography>
          </InputAdornment>
        )
      }}
    />
  );
};

export const SearchField = memo(SearchFieldComponent);
