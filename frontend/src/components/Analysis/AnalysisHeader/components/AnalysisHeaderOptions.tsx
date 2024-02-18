import React, { useState, useContext, useEffect } from 'react';

import dayjs from 'dayjs';

import { Box, MenuItem, SelectChangeEvent } from '@mui/material';

import { DateRange } from 'components/base/DateRange';
import { SwitchButton } from 'components/base/Button/SwitchButton';
import { CustomStyledSelect } from 'components/Select/CustomStyledSelect';

import { StyledDivider } from '../AnalysisHeader.style';

import { frequencyValues } from 'helpers/utils/frequency';
import { AnalysisContext, frequencyData } from 'helpers/context/AnalysisProvider';
import { ModelManagmentSchema, useGetModelAutoFrequencyApiV1ModelsModelIdAutoFrequencyGet } from 'api/generated';

interface AnalysisHeaderOptions {
  model: ModelManagmentSchema;
}

const MAX_WINDOWS_COUNT = 31;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const AnalysisHeaderOptions = ({ model }: AnalysisHeaderOptions) => {
  const { compareWithPreviousPeriod, setCompareWithPreviousPeriod, period, setPeriod, frequency, setFrequency } =
    useContext(AnalysisContext);

  const [minDate, setMinDate] = useState<Date | null>(
    model.start_time && frequency ? dayjs.unix(model.start_time).toDate() : null
  );
  const [maxDate, setMaxDate] = useState<Date | null>(
    model.latest_time && frequency ? dayjs.unix(model.latest_time + frequencyValues.DAY).toDate() : null
  );

  useEffect(() => {
    if (frequency) {
      model.start_time && setMinDate(dayjs.unix(model.start_time).toDate());
      model.latest_time && setMaxDate(dayjs.unix(model.latest_time + frequencyValues.DAY).toDate());
    }
  }, [model, frequency]);

  const { data: defaultFrequency } = useGetModelAutoFrequencyApiV1ModelsModelIdAutoFrequencyGet(model.id, undefined, {
    query: {
      enabled: false
    }
  });

  const handleDateSet = (startTime: Date | undefined, endTime: Date | undefined) => {
    if (startTime && endTime) {
      if (dayjs(startTime).isSame(dayjs(endTime))) {
        startTime.setDate(startTime.getDate() - 1);
        startTime.setHours(0, 0, 0, 0);
        endTime.setHours(23, 59, 59, 999);
      }
      setPeriod([startTime, endTime]);
    }
  };

  const handleFrequencyChange = (event: SelectChangeEvent<unknown>) => setFrequency(Number(event.target.value));

  const handleDateChange = (startTime: Date | undefined, endTime: Date | undefined) => {
    if (frequency && dayjs(startTime).isSame(dayjs(endTime))) {
      const newMin = dayjs(startTime)
        .subtract(frequency * MAX_WINDOWS_COUNT, 'second')
        .toDate();

      const newMax = dayjs(startTime)
        .add(frequency * MAX_WINDOWS_COUNT, 'second')
        .toDate();

      if (model.start_time) {
        const modelStart = dayjs.unix(model.start_time).toDate();

        if (modelStart > newMin) {
          setMinDate(modelStart);
        } else {
          setMinDate(newMin);
        }
      }
      if (model.latest_time) {
        const modelEnd = dayjs.unix(model.latest_time + frequencyValues.DAY).toDate();

        if (modelEnd < newMax) {
          setMaxDate(modelEnd);
        } else {
          setMaxDate(newMax);
        }
      }
    } else {
      if (frequency) {
        model.start_time ? setMinDate(dayjs.unix(model.start_time).toDate()) : setMinDate(null);
        model.latest_time ? setMaxDate(dayjs.unix(model.latest_time + frequencyValues.DAY).toDate()) : setMinDate(null);
      }
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
      <Box display="flex" flexDirection="column" gap="8px">
        <SwitchButton
          checked={compareWithPreviousPeriod}
          setChecked={setCompareWithPreviousPeriod}
          label="Compare with previous period"
        />
      </Box>
    </>
  );
};
