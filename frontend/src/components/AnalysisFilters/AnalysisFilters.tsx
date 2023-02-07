import React, { useContext, useEffect, useMemo, useState } from 'react';

import {
  GetModelColumnsApiV1ModelsModelIdColumnsGet200,
  ModelManagmentSchema,
  useGetModelColumnsApiV1ModelsModelIdColumnsGet,
  useGetModelAutoFrequencyApiV1ModelsModelIdAutoFrequencyGet
} from 'api/generated';

import { AnalysisContext, ColumnsFilters, ComparisonModeOptions, frequencyData } from 'context/analysis-context';

import { styled, alpha, Button, Divider, Stack, MenuItem, SelectChangeEvent, Box, Typography } from '@mui/material';

import { MarkedSelect } from 'components/MarkedSelect';
import { SwitchButton } from 'components/SwitchButton';
import { DropDownFilter } from './components/DropDownFilter';
import FiltersResetButton from 'components/FiltersSort/components/FiltersResetButton';

import { ColumnType } from 'helpers/types/model';
import { comparisonModeData } from './AnalysisFilters.helpers';

import { FilterIcon } from 'assets/icon/icon';
import { DateRange } from 'components/DateRange/DateRange';
import dayjs from 'dayjs';

interface AnalysisFiltersProps {
  model: ModelManagmentSchema;
  fixedHeader?: boolean;
}

export function AnalysisFilters({ model, fixedHeader }: AnalysisFiltersProps) {
  const {
    isComparisonModeOn,
    setIsComparisonModeOn,
    comparisonMode,
    setComparisonMode,
    period,
    setPeriod,
    frequency,
    setFrequency,
    setFilters,
    setInitialFilters,
    filtersLength,
    reset,
    resetAll,
    setDefaultFrequency
  } = useContext(AnalysisContext);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [minDate, setMinDate] = useState<Date | null>(null);
  const [maxDate, setMaxDate] = useState<Date | null>(null);
  const maxWindowsCount = 30;

  const {
    data: columnsMap = {} as GetModelColumnsApiV1ModelsModelIdColumnsGet200,
    refetch: refetchColumns,
    isLoading
  } = useGetModelColumnsApiV1ModelsModelIdColumnsGet(model.id, undefined, {
    query: {
      enabled: false
    }
  });
  const columns = useMemo(
    () => Object.fromEntries(Object.entries(columnsMap).filter(([key, value]) => value.type in ColumnType)),
    [columnsMap]
  );

  const { data: defaultFrequency, refetch: loadDefaultFrequency } =
    useGetModelAutoFrequencyApiV1ModelsModelIdAutoFrequencyGet(model.id, undefined, {
      query: {
        enabled: false
      }
    });

  const handleFiltersClose = () => {
    setAnchorEl(null);
  };

  const handleFiltersOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleComparisonModeChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as ComparisonModeOptions;
    setComparisonMode(value);
  };

  const handleFrequencyChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as number;
    setFrequency(value);
    if (period) {
      setPeriod([
        dayjs(period[1])
          .subtract(value * maxWindowsCount, 'second')
          .toDate(),
        period[1]
      ]);
    }
  };

  useEffect(() => {
    if (model.id != -1) {
      refetchColumns();
      loadDefaultFrequency();
      if (defaultFrequency) {
        setPeriod([new Date(defaultFrequency.start * 1000), new Date(defaultFrequency.end * 1000)]);
        setFrequency(defaultFrequency.frequency);
        setDefaultFrequency(defaultFrequency);
      }
    }
  }, [model, refetchColumns, defaultFrequency, loadDefaultFrequency, setPeriod, setFrequency, setDefaultFrequency]);

  useEffect(() => {
    if (Object.keys(columns).length) {
      const currentFilters: ColumnsFilters = {};

      Object.entries(columns).forEach(([key, value]) => {
        if (value.type === ColumnType.categorical) {
          if (value.stats.values) {
            const categories: Record<string, boolean> = {};

            value.stats.values.forEach(filter => {
              categories[filter] = false;
            });

            currentFilters[key] = categories;
            return;
          }

          currentFilters[key] = {};
        }

        if (value.type === ColumnType.numeric) {
          currentFilters[key] = null;
        }
      });

      setFilters(currentFilters);
      setInitialFilters(currentFilters);
    }
  }, [columns, setFilters, setInitialFilters]);

  const handleDateSet = (startTime: Date | undefined, endTime: Date | undefined) => {
    if (startTime && endTime) {
      setPeriod([startTime, endTime]);
    }
  };

  const handleDateChange = (startTime: Date | undefined, endTime: Date | undefined) => {
    if (frequency && dayjs(startTime).isSame(dayjs(endTime))) {
      setMaxDate(
        dayjs(startTime)
          .add(frequency * maxWindowsCount, 'second')
          .toDate()
      );
      setMinDate(
        dayjs(startTime)
          .subtract(frequency * maxWindowsCount, 'second')
          .toDate()
      );
    } else {
      setMaxDate(null);
      setMinDate(null);
    }
  };

  return (
    <>
      <Stack direction="row" alignItems="center">
        {fixedHeader && <StyledAnalysisFiltersDivider orientation="vertical" flexItem sx={{ ml: '5px' }} />}
        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: '5px', xl: '14px' }}
          marginRight={fixedHeader ? 'auto' : ''}
        >
          <SwitchButton checked={isComparisonModeOn} setChecked={setIsComparisonModeOn} label="Data comparison" />
          <MarkedSelect
            label="Comparison Mode"
            size="small"
            value={comparisonMode}
            onChange={handleComparisonModeChange}
            disabled={!isComparisonModeOn}
            sx={{ width: '178px' }}
            width={{ xs: 150, xl: null }}
          >
            {comparisonModeData.map(({ label, value }, index) => (
              <MenuItem key={`${value}${index}`} value={value}>
                {label}
              </MenuItem>
            ))}
          </MarkedSelect>
          {defaultFrequency ? (
            <>
              <DateRange
                onApply={handleDateSet}
                onChange={handleDateChange}
                startTime={period ? period[0] : undefined}
                endTime={period ? period[1] : undefined}
                minDate={minDate ? minDate : undefined}
                maxDate={maxDate ? maxDate : undefined}
              />
              <MarkedSelect
                label="Frequency"
                size="small"
                value={frequency ? frequency : ''}
                onChange={handleFrequencyChange}
                sx={{ width: '176px' }}
                width={{ xs: 160, xl: null }}
              >
                {frequencyData.map(({ label, value }, index) => (
                  <MenuItem key={`${value}${index}`} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </MarkedSelect>
            </>
          ) : (
            ''
          )}
          <StyledAnalysisFiltersDivider orientation="vertical" flexItem sx={{ ml: fixedHeader ? '27px' : '' }} />
          <StyledFiltersButton
            startIcon={<FilterIcon />}
            variant="text"
            onClick={handleFiltersOpen}
            sx={{
              padding: `10px ${filtersLength ? '40px' : '16px'} 10px 15px`
            }}
          >
            Filter
            {!!filtersLength && <StyledFiltersCount>({filtersLength})</StyledFiltersCount>}
          </StyledFiltersButton>
        </Stack>
        <Box sx={{ ml: 'auto' }}>
          {reset &&
            (fixedHeader ? (
              <FiltersResetButton title="Reset all" handleReset={resetAll} isLoading={isLoading} divider={false} />
            ) : (
              <Stack direction="row" spacing="11px">
                <FiltersResetButton title="Reset all" handleReset={resetAll} isLoading={isLoading} divider={false} />
                <StyledAnalysisFiltersDivider orientation="vertical" flexItem />
              </Stack>
            ))}
        </Box>
      </Stack>
      <DropDownFilter anchorEl={anchorEl} columns={columns} open={!!anchorEl} onClose={handleFiltersClose} />
    </>
  );
}

const StyledAnalysisFiltersDivider = styled(Divider)(({ theme }) => ({
  margin: '0 14px',
  borderColor: alpha(theme.palette.grey[200], 0.5)
}));

const StyledFiltersButton = styled(Button)({
  position: 'relative',
  transform: 'translateX(-15px)',

  '& .MuiButton-startIcon': {
    marginRight: '4px'
  }
});

const StyledFiltersCount = styled(Typography)({
  position: 'absolute',
  left: '77px'
});
