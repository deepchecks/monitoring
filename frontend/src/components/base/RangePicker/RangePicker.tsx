import React, { useState, useEffect } from 'react';

import { useDebounce } from 'helpers/hooks/useDebounce';

import { Stack, Slider, SliderProps, Box } from '@mui/material';

import { StyledInputsWrapper, StyledLabel, StyledTextField } from './RangePicker.style';

interface RangePickerProps extends SliderProps {
  min: number;
  max: number;
  numericValue: number[];
  setNumericValue: React.Dispatch<React.SetStateAction<number[] | undefined>>;
  step?: number;
  disableInputs?: boolean;
}

const DEFAULT_STEP = 0.01;

export const RangePicker = ({
  min,
  max,
  numericValue,
  setNumericValue,
  step = DEFAULT_STEP,
  disableInputs,
  sx,
  ...props
}: RangePickerProps) => {
  const [sliderValues, setSliderValues] = useState([numericValue[0], numericValue[1]]);
  const [inputValues, setInputValues] = useState([numericValue[0].toString(), numericValue[1].toString()]);
  const [minInputError, setMinInputError] = useState(false);
  const [maxInputError, setMaxInputError] = useState(false);

  const debouncedSliderValues: number[] = useDebounce<number[]>(sliderValues);

  useEffect(() => {
    if (numericValue[0] === debouncedSliderValues[0] && numericValue[1] === debouncedSliderValues[1]) return;
    setNumericValue(debouncedSliderValues);
  }, [setNumericValue, debouncedSliderValues, numericValue]);

  const resetErrors = () => {
    setMaxInputError(false);
    setMinInputError(false);
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    const newSliderValue = newValue as number[];
    const newInputValue = [newSliderValue[0].toString(), newSliderValue[1].toString()];

    resetErrors();
    setSliderValues(newSliderValue);
    setInputValues(newInputValue);
  };

  const handleInputChange = (index: 0 | 1) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value: currentInputValue } = event.target;

    const input = +currentInputValue;
    const nonValidInput = input < min || input > max || isNaN(input);

    const currentValues = [...inputValues];
    currentValues[index] = currentInputValue;

    setInputValues(currentValues);

    if (index === 1 && (input <= numericValue[0] || nonValidInput)) {
      setMaxInputError(true);
    } else if (index === 0 && (input >= numericValue[1] || nonValidInput)) {
      setMinInputError(true);
    } else {
      resetErrors();
      setSliderValues([+currentValues[0], +currentValues[1]]);
    }
  };

  return (
    <Box sx={sx}>
      <StyledLabel>Select Value</StyledLabel>
      <Stack spacing="20px">
        <Slider
          value={sliderValues}
          min={min}
          max={max}
          step={step}
          onChange={handleSliderChange}
          valueLabelDisplay="auto"
          {...props}
        />
        {!disableInputs && (
          <StyledInputsWrapper>
            <StyledTextField
              name="min"
              value={inputValues[0]}
              error={minInputError}
              onChange={handleInputChange(0)}
              placeholder={min.toString()}
              type="number"
              InputLabelProps={{
                shrink: true
              }}
            />
            <StyledTextField
              name="max"
              value={inputValues[1]}
              error={maxInputError}
              onChange={handleInputChange(1)}
              placeholder={max.toString()}
              type="number"
              InputLabelProps={{
                shrink: true
              }}
            />
          </StyledInputsWrapper>
        )}
      </Stack>
    </Box>
  );
};
