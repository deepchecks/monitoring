import React from 'react';
import { FormControlLabel, Switch, styled } from '@mui/material';

import { paletteOptions } from '../../../theme/palette';

import { Text } from '../../Text/Text';

export interface ToggleProps {
  label?: string;
  disabled?: boolean;
  labelPlacement?: 'start' | 'end';
  state: boolean;
  setState: (arg: boolean) => void;
}

export const Toggle = (props: ToggleProps) => {
  const { label, disabled, labelPlacement = 'end', state, setState } = props;

  const labelColor = state ? (paletteOptions.primary as any).main : paletteOptions.grey?.[400];

  const CustomSwitch = styled(Switch)(({ theme }) => ({
    width: 80,
    height: 35,
    margin: '0 8px',
    padding: 0,
    boxShadow: '0 0 2px 0.1px lightgray',
    borderRadius: 40,
    '&:active': {
      '& .MuiSwitch-thumb': {
        width: 15
      },
      '& .MuiSwitch-switchBase.Mui-checked': {
        transform: 'translateX(9px)'
      }
    },
    '& .MuiSwitch-switchBase': {
      padding: 4,
      '&.Mui-checked': {
        transform: 'translateX(44px)',
        color: '#fff',
        '& + .MuiSwitch-track': {
          opacity: 1
        }
      }
    },
    '& .MuiSwitch-thumb': {
      boxShadow: '0 2px 4px 0 rgb(0 35 11 / 20%)',
      width: 26,
      height: 26,
      borderRadius: 14,
      transition: theme.transitions.create(['width'], {
        duration: 200
      })
    },
    '& .MuiSwitch-track': {
      borderRadius: 40,
      opacity: 1,
      backgroundColor: theme.palette.grey[300],
      boxSizing: 'border-box'
    }
  }));

  return (
    <FormControlLabel
      control={<CustomSwitch onChange={() => setState(!state)} checked={state} />}
      label={label && <Text text={label} color={labelColor} type="h2" />}
      labelPlacement={labelPlacement}
      disabled={disabled}
    />
  );
};
