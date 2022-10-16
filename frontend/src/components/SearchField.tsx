import { InputAdornment, TextField, TextFieldProps, Typography } from '@mui/material';
import React, { memo } from 'react';
import { SearchIcon } from '../assets/icon/icon';

type SearchFieldComponentProps = {
  onReset?: () => void;
};

const SearchFieldComponent = ({ onReset, ...props }: SearchFieldComponentProps & TextFieldProps) => {
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
        endAdornment:
          !value || !onReset ? (
            <InputAdornment
              position="end"
              sx={{
                cursor: 'pointer',
                svg: {
                  fill: theme => theme.palette.text.disabled
                }
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
              onClick={onReset}
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
