import React, { useState, useContext } from 'react';
import dayjs from 'dayjs';

import { useGetModelAutoFrequencyApiV1ModelsModelIdAutoFrequencyGet } from 'api/generated';
import { AnalysisContext, frequencyData } from 'context/analysis-context';

import { MenuItem, SelectChangeEvent } from '@mui/material';

import { DateRange } from 'components/DateRange';
import { CustomStyledSelect } from 'components/CustomStyledSelect';
import { SwitchButton } from 'components/SwitchButton';

import { StyledDivider } from '../AnalysisHeader.style';

const MAX_WINDOWS_COUNT = 30;

interface AnalysisHeaderOptions {
  modelId: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const AnalysisHeaderOptions = ({ modelId }: AnalysisHeaderOptions) => {
  const { compareWithPreviousPeriod, setCompareWithPreviousPeriod, period, setPeriod, frequency, setFrequency } =
    useContext(AnalysisContext);

  const [minDate, setMinDate] = useState<Date | null>(null);
  const [maxDate, setMaxDate] = useState<Date | null>(null);

  const { data: defaultFrequency } = useGetModelAutoFrequencyApiV1ModelsModelIdAutoFrequencyGet(modelId, undefined, {
    query: {
      enabled: false
    }
  });

  const handleDateSet = (startTime: Date | undefined, endTime: Date | undefined) => {
    if (startTime && endTime) {
      setPeriod([startTime, endTime]);
    }
  };

  const handleDateChange = (startTime: Date | undefined, endTime: Date | undefined) => {
    if (frequency && dayjs(startTime).isSame(dayjs(endTime))) {
      setMaxDate(
        dayjs(startTime)
          .add(frequency * MAX_WINDOWS_COUNT, 'second')
          .toDate()
      );
      setMinDate(
        dayjs(startTime)
          .subtract(frequency * MAX_WINDOWS_COUNT, 'second')
          .toDate()
      );
    } else {
      setMaxDate(null);
      setMinDate(null);
    }
  };

  const handleFrequencyChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as number;
    setFrequency(value);
    if (period) {
      setPeriod([
        dayjs(period[1])
          .subtract(value * MAX_WINDOWS_COUNT, 'second')
          .toDate(),
        period[1]
      ]);
    }
  };

  return (
    <>
      {defaultFrequency && (
        <>
          <DateRange
            onApply={handleDateSet}
            onChange={handleDateChange}
            startTime={period ? period[0] : undefined}
            endTime={period ? period[1] : undefined}
            minDate={minDate ? minDate : undefined}
            maxDate={maxDate ? maxDate : undefined}
          />
          <CustomStyledSelect
            sx={{ minWidth: '115px', marginLeft: '8px' }}
            size="small"
            value={frequency ?? ''}
            onChange={handleFrequencyChange}
          >
            {frequencyData.map(({ label, value }, index) => (
              <MenuItem key={`${value}${index}`} value={value}>
                {label}
              </MenuItem>
            ))}
          </CustomStyledSelect>
        </>
      )}

      <StyledDivider orientation="vertical" flexItem sx={{ marginRight: '29px' }} />

      <SwitchButton
        checked={compareWithPreviousPeriod}
        setChecked={setCompareWithPreviousPeriod}
        label="Compare data with previous period"
      />
    </>
  );
};
