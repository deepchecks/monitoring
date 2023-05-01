import React, { useEffect } from 'react';
import { Radio as MUIRadio } from '@mui/material';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';

import { Text } from '../../Text/Text';

import { paletteOptions } from '../../../theme/palette';

export interface RadioProps {
  state: any;
  setState: (state: any) => void;
  options: {
    value: any;
    label?: string;
  }[];
  formTitle?: string;
  disabled?: boolean;
  defaultValue?: any;
  direction?: 'row' | 'column';
}

export const Radio = (props: RadioProps) => {
  const {
    state,
    setState,
    options,
    formTitle,
    disabled,
    defaultValue = options[0].value,
    direction = 'column'
  } = props;

  const isRow = direction === 'row';

  const labelColor = (value: any) => state === value && (paletteOptions.primary as any).main;

  useEffect(() => {
    const setDefaultValue = () => defaultValue && setState(defaultValue);

    setDefaultValue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FormControl>
      {formTitle && <Text type="bodyBold" text={formTitle} color={(paletteOptions.primary as any).main} />}
      <RadioGroup value={state} defaultValue={defaultValue} row={isRow}>
        {options.map((option, i) => (
          <FormControlLabel
            key={i}
            value={option.value}
            control={<MUIRadio disabled={disabled} />}
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
            onChange={() => setState(option.value)}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
};
