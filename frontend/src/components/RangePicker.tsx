import React, { memo, useState, useCallback, useEffect } from 'react';

import { Stack, styled, Slider, SliderProps, Button } from '@mui/material';

import RangePickerInput, { RangePickerInputProps } from './RangePickerInput';

type RangePickerProps = SliderProps &
  Omit<RangePickerInputProps, 'onChange'> & {
    min: number;
    max: number;
    value: number[];
    handleInputBlur?: () => void;
    handleValueChange: (values: number[]) => void;
    onChange: (event: Event, value: number | number[], activeThumb: number) => void;
  };

const DEFAULT_STEP = 0.01;

export function RangePickerComponent({
  onChange,
  handleValueChange,
  value,
  min,
  max,
  step = DEFAULT_STEP,
  ...props
}: RangePickerProps) {
  const [values, setValues] = useState<number[]>([]);
  const [inputValues, setInputValues] = useState<string[]>([]);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [minInputError, setMinInputError] = useState(false);
  const [maxInputError, setMaxInputError] = useState(false);

  useEffect(() => {
    if (!Array.isArray(value)) return;

    const inputMin = value[0] ? (value[0] < min || value[0] > max || value[0] > value[1] ? min : value[0]) : min;
    const inputMax = value[1] ? (value[1] < min || value[1] > max || value[1] < value[0] ? max : value[1]) : max;

    setValues([inputMin, inputMax]);
    setInputValues([inputMin.toString(), inputMax.toString()]);
    handleValueChange([inputMin, inputMax]);
  }, [min, max]);

  const resetErrors = () => {
    setButtonDisabled(false);
    setMaxInputError(false);
    setMinInputError(false);
  };

  const handleSliderChange = useCallback(
    (event: Event, newValue: number | number[], activeThumb: number) => {
      onChange(event, newValue, activeThumb);

      const val = newValue as number[];
      const inputVal = [val[0].toString(), val[1].toString()];

      resetErrors();
      setValues(val);
      setInputValues(inputVal);
    },
    [onChange]
  );

  const handleInputChange = useCallback(
    (index: 0 | 1) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value: currentInputValue } = event.target;

      const input = +currentInputValue;
      const check = input < min || input > max || isNaN(input);

      setInputValues(prevState => {
        const currentValues = [...prevState];
        currentValues[index] = currentInputValue;
        return currentValues;
      });

      if (index === 1 && (input <= value[0] || input === value[0] || check)) {
        setMaxInputError(true);
        setButtonDisabled(true);
      } else if (index === 0 && (input >= value[1] || input === value[1] || check)) {
        setMinInputError(true);
        setButtonDisabled(true);
      } else {
        resetErrors();
      }
    },
    [max, min, value]
  );

  const applyInputValues = useCallback(() => {
    const result = [+inputValues[0], +inputValues[1]];
    handleValueChange(result);
    setValues(result);
  }, [handleValueChange, inputValues]);

  return (
    <Stack spacing="20px">
      <Slider value={values} min={min} max={max} step={step} onChange={handleSliderChange} {...props} />
      <StyledInputWrapper>
        <StyledRangePickerInput
          error={minInputError}
          step={step}
          value={inputValues[0]}
          min={min}
          max={max}
          name="min"
          onChange={handleInputChange(0)}
          InputLabelProps={{
            shrink: true
          }}
        />
        {' - '}
        <StyledRangePickerInput
          error={maxInputError}
          step={step}
          value={inputValues[1]}
          min={min}
          max={max}
          name="max"
          onChange={handleInputChange(1)}
          InputLabelProps={{
            shrink: true
          }}
        />
        <Button disabled={buttonDisabled} onClick={applyInputValues}>
          Ok
        </Button>
      </StyledInputWrapper>
    </Stack>
  );
}

export const StyledInputWrapper = styled(Stack)({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center'
});

const StyledRangePickerInput = styled(RangePickerInput)({
  '& .MuiOutlinedInput-input': {
    padding: '4px 8px',
    width: 85
  }
});

export const RangePicker = memo(RangePickerComponent);
