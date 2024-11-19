import React, { useEffect } from 'react';

import { Radio as MUIRadio } from '@mui/material';
import RadioGroup from '@mui/material/RadioGroup';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Text } from '../../Text/Text';

import { paletteOptions } from '../../../theme/palette';

export interface RadioProps {
  state: string | undefined;
  setState: (state: string) => void;
  options: {
    value: string;
    label?: string;
  }[];
  formTitle?: string;
  disabled?: boolean;
  defaultValue?: string;
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

  const labelColor = (value: string) =>
    state === value && paletteOptions.primary
      ? paletteOptions.primary['main' as keyof typeof paletteOptions.primary]
      : '';

  useEffect(() => {
    const setDefaultValue = () => defaultValue && setState(defaultValue);

    setDefaultValue();
  }, []);

  return (
    <FormControl>
      {formTitle && <Text type="bodyBold" text={formTitle} color={paletteOptions.grey?.[500]} />}
      <RadioGroup value={state} defaultValue={defaultValue} row={isRow}>
        {options.map((option, i) => (
          <FormControlLabel
            key={i}
            value={option.value}
            control={<MUIRadio disabled={disabled} />}
            data-testid={`Radio${option.value}`}
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
