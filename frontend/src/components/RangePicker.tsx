import { Slider, SliderProps, Stack } from '@mui/material';
import React, { memo } from 'react';

import { Box, styled } from '@mui/material';
import RangePickerInput, { RangePickerInputProps } from './RangePickerInput';
import pick from 'lodash/pick';

export const StyledInputWrapper = styled(Box)({
  display: 'flex',
  justifyContent: 'end'
});

type RangePickerProps = SliderProps &
  Omit<RangePickerInputProps, 'onChange'> & {
    handleInputBlur?: () => void;
    handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  };

const DEFAULT_STEP = 0.01;

export function RangePickerComponent({ handleInputBlur, handleInputChange, step, ...props }: RangePickerProps) {
  return (
    <Stack spacing="20px">
      <Slider step={DEFAULT_STEP} {...props} />
      <StyledInputWrapper>
        <RangePickerInput
          sx={{
            '& .MuiOutlinedInput-input': {
              padding: '4px 12px',
              width: 60
            }
          }}
          step={DEFAULT_STEP}
          {...pick(props, ['name', 'min', 'max', 'value'])}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          InputLabelProps={{
            shrink: true
          }}
        />
      </StyledInputWrapper>
    </Stack>
  );
}

export const RangePicker = memo(RangePickerComponent);
