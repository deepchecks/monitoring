import { alpha, Box, Button, Slider, Stack, styled, TextField } from '@mui/material';
import { ColumnStatistics } from 'api/generated';
import { AnalysisContext } from 'Context/AnalysisContext';
import React, { useContext } from 'react';

interface NumericFilterProps {
  data: ColumnStatistics;
  column: string;
  onClose: () => void;
}

const StyledNumericField = styled(TextField)(({ theme }) => ({
  width: 48,
  '.MuiInputBase-input': {
    padding: '8px',
    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
      WebkitAppearance: 'none',
      margin: 0
    }
  },
  '.MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.grey[200]
  }
}));

export function NumericFilter({ data, column, onClose }: NumericFilterProps) {
  const { filters, setFilters } = useContext(AnalysisContext);

  const minValue = typeof data.min === 'number' ? data.min : -999;
  const maxValue = typeof data.max === 'number' ? data.max : 999;

  const [values, setValues] = React.useState<(number | '')[]>(() => {
    const filter = filters[column];
    if (filter && typeof filter[0] === 'number' && typeof filter[1] === 'number') {
      return [filter[0], filter[1]];
    }
    const step = setStep();
    return [minValue + step * 4, maxValue - step * 4];
  });

  function setStep() {
    if (typeof data.min === 'number' && typeof data.max === 'number') {
      return (data.max - data.min) / 10;
    }

    return 100;
  }

  const handleValuesChange = (event: Event, newValue: number | number[], activeThumb: number) => {
    if (!Array.isArray(newValue) || typeof values[0] !== 'number' || typeof values[1] !== 'number') {
      return;
    }

    if (activeThumb === 0) {
      setValues([Math.min(newValue[0], values[1] - setStep()), values[1]]);
    } else {
      setValues([values[0], Math.max(newValue[1], values[0] + setStep())]);
    }
  };

  const handleInputChange = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    if ((!index && value < values[1]) || (index && value > values[0])) {
      setValues(prevState => {
        const currentValues = [...prevState];
        currentValues[index] = value === '' ? '' : Number(value);
        return currentValues;
      });
    }
  };

  const handleInputBlur = (index: number) => () => {
    if (!index && values[0] < minValue) {
      setValues(prevState => {
        const currentValues = [...prevState];
        currentValues[index] = minValue;
        return currentValues;
      });
      return;
    }

    if (index && values[1] > maxValue) {
      setValues(prevState => {
        const currentValues = [...prevState];
        currentValues[index] = maxValue;
        return currentValues;
      });
    }
  };

  const onApply = () => {
    setFilters(prevFilters => ({ ...prevFilters, [column]: [+values[0], +values[1]] }));
    onClose();
  };

  return (
    <Box width={380}>
      <Box padding="19px 30px 20px">
        <Slider
          onChange={handleValuesChange}
          getAriaLabel={() => 'Minimum distance'}
          disableSwap
          value={values.map(value => +value)}
          marks
          step={setStep()}
          min={minValue}
          max={maxValue}
        />
        <Stack direction="row" justifyContent="space-between">
          <StyledNumericField
            type="number"
            size="small"
            onChange={handleInputChange(0)}
            onBlur={handleInputBlur(0)}
            inputProps={{
              min: minValue,
              max: maxValue
            }}
            InputLabelProps={{
              shrink: true
            }}
            value={values[0]}
          />

          <StyledNumericField
            type="number"
            size="small"
            onChange={handleInputChange(1)}
            onBlur={handleInputBlur(1)}
            inputProps={{
              min: minValue,
              max: maxValue
            }}
            InputLabelProps={{
              shrink: true
            }}
            value={values[1]}
          />
        </Stack>
      </Box>

      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        padding="10px 0"
        borderTop={theme => `1px solid ${alpha(theme.palette.grey[200], 0.5)}`}
      >
        <Button onClick={onApply} variant="text">
          Apply
        </Button>
      </Box>
    </Box>
  );
}
