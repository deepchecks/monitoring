import React from 'react';

import { styled, FormControlLabel, Switch, SwitchProps } from '@mui/material';

interface SwitchButtonProps extends SwitchProps {
  label?: string;
  checked: boolean;
  setChecked: React.Dispatch<React.SetStateAction<boolean>>;
}

export function SwitchButton({ checked, setChecked, label, sx, ...props }: SwitchButtonProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
  };

  return (
    <StyledFormControlLabel
      control={<StyledSwitch sx={{ ...sx }} checked={checked} onChange={handleChange} {...props} />}
      label={label}
      labelPlacement="start"
    />
  );
}

const StyledFormControlLabel = styled(FormControlLabel)({
  margin: 0,

  '& .MuiFormControlLabel-label': {
    marginRight: '9px'
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
