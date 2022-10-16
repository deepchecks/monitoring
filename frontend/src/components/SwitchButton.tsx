import { FormControlLabel, Switch, SwitchProps, SxProps, Typography } from '@mui/material';
import React from 'react';

interface SwitchButtonProps extends SwitchProps {
  labelStyle?: SxProps;
}

export function SwitchButton({ labelStyle = {}, sx, ...props }: SwitchButtonProps) {
  return (
    <FormControlLabel
      sx={{
        padding: '2px 0 2px 2px',
        margin: '0 0 0 14px'
      }}
      control={
        <Switch
          defaultChecked
          sx={{
            height: 'max-content',
            width: 'max-content',
            '& .MuiSwitch-thumb': {
              height: 20,
              width: 20
            },
            '& .MuiSwitch-track': {
              width: 34,
              height: 14,
              opacity: 0.5
            },
            ...sx
          }}
          {...props}
        />
      }
      label={
        <Typography
          variant="subtitle2"
          sx={{
            ml: '5px',
            color: theme => theme.palette.text.disabled,
            ...labelStyle
          }}
        >
          Compare to previous period
        </Typography>
      }
    />
  );
}
