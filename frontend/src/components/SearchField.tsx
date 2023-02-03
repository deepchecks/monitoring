import React, { memo } from 'react';

import { InputAdornment, TextField, TextFieldProps, Typography } from '@mui/material';

import { SearchIcon } from '../assets/icon/icon';
import { colors } from 'theme/colors';

type SearchFieldComponentProps = {
  onReset?: () => void;
};

const SearchFieldComponent = ({ onReset, ...props }: SearchFieldComponentProps & TextFieldProps) => {
  const { onChange, value } = props;

  return (
    <TextField
      onChange={onChange}
      sx={{
        'input::placeholder': {
          opacity: 1
        },

        '& .MuiOutlinedInput-root': {
          color: colors.neutral.lightText,
          borderRadius: '10px',

          '& fieldset': {
            borderColor: colors.neutral.grey.light,
            transition: 'border-color 0.3s ease'
          },

          '&:hover fieldset, &.Mui-focused fieldset': {
            borderColor: colors.neutral.darkText
          }
        }
      }}
      placeholder="Search Model..."
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
              <Typography variant="subtitle2" color={colors.neutral.darkText}>
                Reset
              </Typography>
            </InputAdornment>
          )
      }}
    />
  );
};

export const SearchField = memo(SearchFieldComponent);
