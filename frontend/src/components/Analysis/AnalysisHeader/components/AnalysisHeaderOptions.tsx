import React, { useState, useContext, useEffect } from 'react';
import { MenuItem, SelectChangeEvent } from '@mui/material';
import dayjs from 'dayjs';

import { ModelManagmentSchema, useGetModelAutoFrequencyApiV1ModelsModelIdAutoFrequencyGet } from 'api/generated';
import { AnalysisContext, frequencyData } from 'helpers/context/AnalysisProvider';
import { frequencyValues } from 'helpers/utils/frequency';

import { DateRange } from 'components/DateRange';
import { CustomStyledSelect } from 'components/Select/CustomStyledSelect';

import { StyledDivider } from '../AnalysisHeader.style';

import { constants } from 'components/Analysis/analysis.constants';

interface AnalysisHeaderOptions {
  model: ModelManagmentSchema;
}

const MAX_WINDOWS_COUNT = 31;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const AnalysisHeaderOptions = ({ model }: AnalysisHeaderOptions) => {
  const {
    period,
    setPeriod,
    frequency,
    setFrequency,
    compareByReference,
    setCompareByReference,
    compareWithPreviousPeriod,
    setCompareWithPreviousPeriod
  } = useContext(AnalysisContext);

  const [minDate, setMinDate] = useState<Date | null>(
    model.start_time && frequency ? dayjs.unix(model.start_time).toDate() : null
  );
  const [maxDate, setMaxDate] = useState<Date | null>(
    model.latest_time && frequency ? dayjs.unix(model.latest_time + frequencyValues.DAY).toDate() : null
  );

  const periodComparison = constants.header.periodComparison;
  const referenceComparison = constants.header.referenceComparison;
  const noComparison = constants.header.noComparison;
  const comparisonDropdownVal = compareByReference
    ? referenceComparison
    : compareWithPreviousPeriod
    ? periodComparison
    : noComparison;

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

  const handleFrequencyChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as number;
    setFrequency(value);
    let windows_count = 12;
    if (value < frequencyValues.DAY) {
      windows_count = 24;
    } else if (value < frequencyValues.WEEK) {
      windows_count = 31;
    }
    if (period) {
      let start_date = dayjs(period[1])
        .subtract(value * windows_count, 'second')
        .toDate();
      if (model.start_time) {
        const model_start_date = dayjs.unix(model.start_time).toDate();
        if (model_start_date > start_date) {
          start_date = model_start_date;
        }
      }
      setPeriod([start_date, period[1]]);
    }
  };

  const handleDateChange = (startTime: Date | undefined, endTime: Date | undefined) => {
    // limit selection to only 30 windows
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

  const handleSelectChange = (event: SelectChangeEvent) => {
    const selectedValue = event.target.value;

    if (selectedValue === referenceComparison) {
      setCompareByReference(true);
      setCompareWithPreviousPeriod(false);
    } else if (selectedValue === periodComparison) {
      setCompareByReference(false);
      setCompareWithPreviousPeriod(true);
    } else {
      setCompareByReference(false);
      setCompareWithPreviousPeriod(false);
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
      <CustomStyledSelect
        sx={{ minWidth: '115px', marginRight: '12px' }}
        size="small"
        value={comparisonDropdownVal}
        onChange={e => handleSelectChange(e as SelectChangeEvent)}
      >
        <MenuItem key={noComparison} value={noComparison}>
          {noComparison}
        </MenuItem>
        <MenuItem key={referenceComparison} value={referenceComparison}>
          {referenceComparison}
        </MenuItem>
        <MenuItem key={periodComparison} value={periodComparison}>
          {periodComparison}
        </MenuItem>
      </CustomStyledSelect>
    </>
  );
};
