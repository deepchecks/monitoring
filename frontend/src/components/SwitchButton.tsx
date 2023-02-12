import React from 'react';

import { styled, FormControlLabel, Switch, SwitchProps } from '@mui/material';

export interface SwitchButtonProps extends SwitchProps {
  label?: string;
  checked: boolean;
  setChecked: React.Dispatch<React.SetStateAction<boolean>>;
  labelPlacement?: 'bottom' | 'top' | 'start' | 'end';
}

export function SwitchButton({
  checked,
  setChecked,
  label,
  labelPlacement = 'start',
  sx,
  ...props
}: SwitchButtonProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
  };

  return (
    <StyledFormControlLabel
      control={<StyledSwitch sx={{ ...sx }} checked={checked} onChange={handleChange} {...props} />}
      label={label}
      labelPlacement={labelPlacement}
    />
  );
}

const StyledFormControlLabel = styled(FormControlLabel)({
  margin: 0,

  '& .MuiFormControlLabel-label': {
    marginRight: '9px',
    '@media (max-width: 1536px)': {
      fontSize: '12px',
      width: '70px',
      marginRight: 0
    },

    '&.Mui-disabled': {
      opacity: 0.3
    }
  }
});

const StyledSwitch = styled(Switch)({
  height: 'max-content',
  width: 'max-content',

  '& .MuiSwitch-thumb': {
    height: 20,
    width: 20
  },

  '& .MuiSwitch-track': {
    width: 34,
    height: 14
  }
});
