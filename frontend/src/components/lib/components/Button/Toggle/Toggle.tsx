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

  const StyledFormControlLabel = styled(FormControlLabel)({
    marginRight: 0,

    '& .MuiFormControlLabel-label': {
      marginRight: '9px',
      fontSize: '14px',
      fontWeight: 600,
      lineHeight: '17px',
      transform: 'translateY(-1px)',

      '&.Mui-disabled': {
        opacity: 0.3
      }
    }
  });

  const StyledSwitch = styled(Switch)(({ theme }) => ({
    width: 40,
    height: 20,
    padding: 0,
    marginRight: 12,
    display: 'flex',
    '&:active': {
      '& .MuiSwitch-thumb': {
        width: 20
      },
      '& .MuiSwitch-switchBase.Mui-checked': {
        transform: 'translateX(16.5px)'
      }
    },
    '& .MuiSwitch-switchBase': {
      padding: 2,
      '&.Mui-checked': {
        transform: 'translateX(19.5px)',
        color: theme.palette.common.white,
        '& + .MuiSwitch-track': {
          opacity: 1,
          backgroundColor: theme.palette.primary.main
        }
      }
    },
    '& .MuiSwitch-thumb': {
      boxShadow: '0 2px 4px 0 rgb(0 35 11 / 20%)',
      width: 16,
      height: 16,
      borderRadius: 16 / 2,
      transition: theme.transitions.create(['width'], {
        duration: 200
      })
    },
    '& .MuiSwitch-track': {
      borderRadius: '16px',
      opacity: 1,
      backgroundColor: theme.palette.text.disabled,
      boxSizing: 'border-box'
    }
  }));

  return (
    <StyledFormControlLabel
      control={<StyledSwitch onChange={() => setState(!state)} checked={state} />}
      label={label && <Text text={label} color={labelColor} type="h3" />}
      labelPlacement={labelPlacement}
      disabled={disabled}
    />
  );
};
