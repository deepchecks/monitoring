import React, { useState } from 'react';

import { Box, Link } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select/SelectInput';

import { SelectPrimary, SelectPrimaryItem } from './SelectPrimary/SelectPrimary';
import { Subcategory } from 'components/Subcategory';

import { timeWindow } from '../helpers/monitorFields.helpers';

interface SelectFrequencyProps {
  timeWindows?: { label: string; value: number }[];
  frequency: number;
  aggregation_window: number;
  setFieldValue: (fieldName: string, value: any, shouldValidate?: boolean | undefined) => any;
}

export const SelectFrequency = ({ timeWindows = timeWindow, setFieldValue, ...props }: SelectFrequencyProps) => {
  const [advanced, setAdvanced] = useState<boolean>(false);
  const [aggWindow, setAggWindow] = useState<number>(props.aggregation_window);
  const [frequency, setFrequency] = useState<number>(props.frequency);

  const handleFrequencyChange = (event: SelectChangeEvent<number | unknown>) => {
    setFieldValue('frequency', event.target.value as number);
    setFrequency(event.target.value as number);
    if (!advanced) {
      handleAggWindowChange(event);
    }
  };

  const handleAggWindowChange = (event: SelectChangeEvent<number | unknown>) => {
    setFieldValue('aggregation_window', event.target.value as number);
    setAggWindow(event.target.value as number);
  };

  return (
    <Box sx={{ mb: '40px' }}>
      <SelectPrimary label="Frequency" onChange={handleFrequencyChange} value={frequency} sx={{ mb: 0 }}>
        {timeWindows.map(({ label, value }) => (
          <SelectPrimaryItem value={value} key={label}>
            {label}
          </SelectPrimaryItem>
        ))}
      </SelectPrimary>
      {!advanced ? (
        <Link
          underline="hover"
          sx={{ display: 'flex' }}
          onClick={() => {
            setAdvanced(true);
          }}
        >
          Advanced
        </Link>
      ) : (
        ''
      )}
      {!advanced ? (
        ''
      ) : (
        <Subcategory>
          <SelectPrimary label="Aggregation Window" onChange={handleAggWindowChange} value={aggWindow}>
            {timeWindows.map(({ label, value }) => (
              <SelectPrimaryItem value={value} key={label}>
                {label}
              </SelectPrimaryItem>
            ))}
          </SelectPrimary>
        </Subcategory>
      )}
    </Box>
  );
};
