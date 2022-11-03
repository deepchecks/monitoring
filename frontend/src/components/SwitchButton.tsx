import React, { useState } from 'react';

import { styled, Grid, Switch, SwitchProps } from '@mui/material';

import { colors } from 'theme/colors';

interface SwitchButtonProps extends SwitchProps {
  titleLeft?: string;
  titleRight?: string;
}

export function SwitchButton({ titleLeft, titleRight, sx, ...props }: SwitchButtonProps) {
  const [checked, setChecked] = useState(true);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
  };

  return (
    <Grid component="label" container alignItems="center" spacing={1} sx={{ ml: '20px', mr: '34px' }}>
      <Grid
        item
        sx={{
          color: theme => (!checked ? theme.palette.text.primary : theme.palette.text.disabled)
        }}
      >
        {titleLeft}
      </Grid>
      <Grid item>
        <StyledSwitch
          sx={{
            ...sx
          }}
          checked={checked}
          onChange={handleChange}
          {...props}
        />
      </Grid>
      <Grid
        item
        sx={{
          color: theme => (checked ? theme.palette.text.primary : theme.palette.text.disabled)
        }}
      >
        {titleRight}
      </Grid>
    </Grid>
  );
}

const StyledSwitch = styled(Switch)({
  height: 'max-content',
  width: 'max-content',
  '& .MuiSwitch-thumb': {
    height: 20,
    width: 20,
    backgroundColor: colors.primary.violet[400]
  },
  '& .MuiSwitch-track': {
    width: 34,
    height: 14,
    backgroundColor: colors.primary.violet[400],
    opacity: 0.5
  },
  '& .Mui-checked': {
    '& + .MuiSwitch-track': {
      backgroundColor: colors.primary.violet[400],
      opacity: 0.5
    }
  }
});
