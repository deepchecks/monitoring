import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import deepmerge from 'deepmerge';

export type RangePickerInputProps = TextFieldProps & {
  min?: number;
  max?: number;
  step?: number;
};

const RangePickerInput = ({ min, max, step, inputProps, ...props }: RangePickerInputProps) => (
  <TextField
    placeholder="0"
    type="number"
    {...props}
    inputProps={deepmerge<RangePickerInputProps['inputProps']>(inputProps, {
      min,
      max,
      step
    })}
  />
);

export default RangePickerInput;
