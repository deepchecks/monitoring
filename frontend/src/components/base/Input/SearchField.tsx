import React, { memo } from 'react';

import { InputAdornment, TextField, TextFieldProps, Typography } from '@mui/material';

import { SearchIcon } from '../../../assets/icon/icon';

import { theme } from 'components/lib/theme';

type SearchFieldComponentProps = {
  onReset?: () => void;
} & TextFieldProps;

const SearchFieldComponent = ({ onReset, ...props }: SearchFieldComponentProps) => {
  const { onChange, value } = props;

  return (
    <TextField
      onChange={onChange}
      sx={{
        'input::placeholder': {
          opacity: 1
        },

        '& .MuiOutlinedInput-root': {
          color: theme.palette.text.disabled,
          borderRadius: '10px',

          '& fieldset': {
            borderColor: theme.palette.grey.light,
            transition: 'border-color 0.3s ease'
          },

          '&:hover fieldset, &.Mui-focused fieldset': {
            borderColor: theme.palette.text.primary
          }
        }
      }}
      variant="outlined"
      value={value}
      {...props}
      InputProps={{
        endAdornment:
          !value || !onReset ? (
            <InputAdornment position="end">
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
              <Typography variant="subtitle2" color={theme.palette.text.primary}>
                Reset
              </Typography>
            </InputAdornment>
          )
      }}
    />
  );
};

export const SearchField = memo(SearchFieldComponent);
