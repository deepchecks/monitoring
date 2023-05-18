import React, { useState } from 'react';
import { Checkbox as MUICheckbox, FormGroup, CheckboxProps as MUICheckboxProps } from '@mui/material';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';

import { Text } from '../../Text/Text';

import { paletteOptions } from '../../../theme/palette';

export interface CheckboxProps extends MUICheckboxProps {
  state: any[];
  setState: (state: any) => void;
  options: {
    value: any;
    label?: string;
  }[];
  formTitle?: string;
  disabled?: boolean;
  defaultValue?: any;
  direction?: 'row' | 'column';
  limit?: number;
}

export const Checkbox = (props: CheckboxProps) => {
  const {
    state,
    setState,
    options,
    formTitle,
    disabled,
    direction = 'column',
    limit = options.length,
    ...otherProps
  } = props;

  const [err, setErr] = useState(false);

  const labelColor = (value: any) => state.includes(value) && (paletteOptions.primary as any).main;

  const handleCheckboxClick = (value: any) => {
    setErr(false);

    if (state.includes(value)) {
      setState(state.filter((stateVal: any) => value !== stateVal));
    } else {
      if (state.length === limit) {
        setErr(true);
      } else {
        setState([...state, value]);
      }
    }
  };

  return (
    <FormControl>
      {formTitle && <Text type="bodyBold" text={formTitle} color={(paletteOptions.primary as any).main} />}
      <FormGroup row={direction === 'row'}>
        {options.map((option, i) => (
          <FormControlLabel
            key={i}
            value={option.value}
            control={<MUICheckbox disabled={disabled} checked={state.includes(option.value)} {...otherProps} />}
            label={
              option.label && (
                <Text
                  color={() => labelColor(option.value)}
                  text={option.label}
                  type="bodyBold"
                  margin="2px 0 0 -2px"
                />
              )
            }
            onChange={() => handleCheckboxClick(option.value)}
          />
        ))}
      </FormGroup>
      {err && <Text color={(paletteOptions.error as any).main} type="h3" text={`Limited to ${limit} selections`} />}
    </FormControl>
  );
};
