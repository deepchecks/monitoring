import React, { useContext, useState } from 'react';

import { ColumnStatistics } from 'api/generated';
import { AnalysisContext } from 'helpers/context/AnalysisProvider';

import { alpha, Box, Button } from '@mui/material';
import { RangePicker } from 'components/base/RangePicker/RangePicker';

interface NumericFilterProps {
  data: ColumnStatistics;
  column: string;
  onClose: () => void;
}

function setStep(data: ColumnStatistics) {
  if (typeof data.min === 'number' && typeof data.max === 'number') {
    if (data.max === data.min) return data.max / 10;

    return (data.max - data.min) / 10;
  }

  return 100;
}

export function NumericFilter({ data, column, onClose }: NumericFilterProps) {
  const { filters, setFilters } = useContext(AnalysisContext);

  const minValue =
    typeof data.min === 'number' ? (data.min === data.max ? (data.max > 0 ? 0 : data.max / 10) : data.min) : -999;
  const maxValue = typeof data.max === 'number' ? data.max : 999;

  const [numericValue, setNumericValue] = useState<number[] | undefined>(() => {
    const filter = filters[column];

    if (filter && typeof filter[0] === 'number' && typeof filter[1] === 'number') {
      return [filter[0], filter[1]];
    }

    const step = setStep(data);
    return [minValue + step * 4, maxValue - step * 4];
  });

  const onApply = () => {
    numericValue && setFilters(prevFilters => ({ ...prevFilters, [column]: [numericValue[0], numericValue[1]] }));
    onClose();
  };

  return (
    <Box width={380}>
      {numericValue && (
        <RangePicker
          sx={{ width: '90%', margin: '1em auto' }}
          min={minValue}
          max={maxValue}
          numericValue={numericValue}
          setNumericValue={setNumericValue}
        />
      )}
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
