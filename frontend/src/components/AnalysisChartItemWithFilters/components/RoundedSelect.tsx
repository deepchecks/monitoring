import React, { ReactNode } from 'react';

import { FormControl, SelectProps, Typography, InputLabel, Select } from '@mui/material';

interface RoundedSelectProps extends SelectProps {
  children: ReactNode;
  label: string;
  fullWidth?: boolean;
}

const sizeMap = {
  small: 'small',
  medium: 'normal'
} as const;

export function RoundedSelect({ children, label, fullWidth = false, size, ...props }: RoundedSelectProps) {
  return (
    <FormControl
      fullWidth={fullWidth}
      sx={{
        minHeight: 30,
        height: 30
      }}
    >
      <InputLabel
        size={size ? sizeMap[size] : sizeMap.medium}
        sx={theme => ({
          '&.MuiFormLabel-root.MuiInputLabel-root': {
            color: theme.palette.primary.main
          },
          transform: 'translate(14px, 7px) scale(1)',
          '&.Mui-focused, &.MuiFormLabel-filled': {
            transform: 'translate(14px, -5px) scale(0.75)',
            color: theme.palette.primary.main
          }
        })}
      >
        <Typography variant="subtitle2" sx={{ lineHeight: '17px' }}>
          {label}
        </Typography>
      </InputLabel>
      <Select
        size={size}
        label={label}
        sx={theme => ({
          minWidth: 135,
          minHeight: 30,
          fontSize: 12,
          lineHeight: '17px',
          letterSpacing: '0.1px',
          color: theme.palette.primary.main,
          borderRadius: '1000px',
          '& .MuiOutlinedInput-notchedOutline, &:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main
          },
          '& .MuiSelect-select': {
            padding: '6.5px 22px 6.5px 10px'
          },
          '& legend': {
            width: 80
          },
          '& svg': {
            color: theme.palette.primary.main
          }
        })}
        {...props}
      >
        {children}
      </Select>
    </FormControl>
  );
}
