import React, { useContext, useEffect, useState } from 'react';

import {
  GetModelColumnsApiV1ModelsModelIdColumnsGet200,
  ModelManagmentSchema,
  useGetModelColumnsApiV1ModelsModelIdColumnsGet
} from 'api/generated';

import { AnalysisContext, ColumnsFilters } from 'context/analysis-context';

import { timeMap } from 'helpers/timeValue';
import { ColumnType } from 'helpers/types/model';

import { alpha, Button, Divider, Stack, MenuItem, SelectChangeEvent, Box } from '@mui/material';

import { ExpandableSelection } from 'components/ExpandableSelection';
import { MarkedSelect } from 'components/MarkedSelect';
import { SwitchButton } from 'components/SwitchButton';
import { DropDownFilter } from './components/DropDownFilter';
import FiltersSortButton from 'components/FiltersSort/components/FiltersSortButton';
import FiltersResetButton from 'components/FiltersSort/components/FiltersResetButton';

import { timeValues } from 'helpers/timeValue';

import { FilterIcon } from 'assets/icon/icon';

interface AnalysisFiltersProps {
  model: ModelManagmentSchema;
}

const lookBackData = [
  { label: 'Last 7 Days', value: timeMap.week },
  { label: 'Last 30 Days', value: timeMap.month }
];

const frequencyData = [
  { label: 'Hourly', value: timeValues.hour },
  { label: 'Daily', value: timeValues.day },
  { label: 'Weekly', value: timeValues.week },
  { label: 'Monthly', value: timeValues.mouth }
];

export function AnalysisFilters({ model }: AnalysisFiltersProps) {
  const { setFilters, setPeriod, frequency, setFrequency } = useContext(AnalysisContext);

  const [lookback, setLookback] = useState(lookBackData[0].value);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [anchorElSortMenu, setAnchorElSortMenu] = useState<HTMLElement | null>(null);

  const {
    data: columns = {} as GetModelColumnsApiV1ModelsModelIdColumnsGet200,
    refetch,
    isLoading
  } = useGetModelColumnsApiV1ModelsModelIdColumnsGet(model.id, {
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

  const handleFrequencyChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as number;
    setFrequency(value);
  };

  const handleOpenSortMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorElSortMenu(e.currentTarget);
  };

  const handleCloseSortMenu = () => {
    setAnchorElSortMenu(null);
  };

  const handleResetFilters = () => {
    console.log('reset filters');
  };

  console.log(frequency);

  useEffect(() => {
    const time = model.latest_time ? model.latest_time * 1000 : Date.now();
    setPeriod([new Date(time - lookBackData[0].value), new Date(time)]);
  }, [model, setPeriod]);

  useEffect(() => {
    if (model.id !== -1) {
      refetch();
    }
  }, [model, refetch]);

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
    }
  }, [columns, setFilters]);

  return (
    <>
      <Stack direction="row" alignItems="center">
        <Stack direction="row" alignItems="center">
          <SwitchButton titleLeft="Reference" titleRight="Previous period" />
          <ExpandableSelection
            label="Look Back Window"
            changeState={setLookback}
            data={lookBackData}
            value={lookback}
            endTime={model.latest_time}
          />
          <Box sx={{ ml: '14px' }}>
            <MarkedSelect
              size="small"
              value={frequency}
              onChange={handleFrequencyChange}
              label="Frequency"
              sx={{ width: '176px' }}
            >
              {frequencyData.map(({ label, value }, index) => (
                <MenuItem key={`${value}${index}`} value={value}>
                  {label}
                </MenuItem>
              ))}
            </MarkedSelect>
          </Box>
          <Divider
            orientation="vertical"
            flexItem
            sx={{ margin: '0 14px', borderColor: theme => alpha(theme.palette.grey[200], 0.5) }}
          />
          <Button
            startIcon={<FilterIcon />}
            variant="text"
            onClick={handleFiltersOpen}
            sx={{
              padding: '10px 5px 10px 1px',
              transform: 'translateX(-14px)',
              '& .MuiButton-startIcon': {
                marginRight: '4px'
              }
            }}
          >
            Filter
          </Button>
        </Stack>
        <Box sx={{ ml: 'auto' }}>
          <Stack direction="row" spacing="11px">
            <FiltersResetButton title="Reset all" handleReset={handleResetFilters} isLoading={isLoading} />
            <FiltersSortButton handleOpenSortMenu={handleOpenSortMenu} isLoading={isLoading} />
          </Stack>
        </Box>
      </Stack>
      <DropDownFilter anchorEl={anchorEl} columns={columns} open={!!anchorEl} onClose={handleFiltersClose} />
    </>
  );
}
