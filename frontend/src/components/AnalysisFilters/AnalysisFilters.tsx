import React, { useContext, useEffect, useState } from 'react';

import {
  GetModelColumnsApiV1ModelsModelIdColumnsGet200,
  ModelManagmentSchema,
  useGetModelColumnsApiV1ModelsModelIdColumnsGet
} from 'api/generated';

import {
  AnalysisContext,
  ColumnsFilters,
  ComparisonModeOptions,
  frequencyData,
  lookBackData
} from 'context/analysis-context';

import { styled, alpha, Button, Divider, Stack, MenuItem, SelectChangeEvent, Box, Typography } from '@mui/material';

import { ExpandableSelection } from 'components/ExpandableSelection';
import { MarkedSelect } from 'components/MarkedSelect';
import { SwitchButton } from 'components/SwitchButton';
import { DropDownFilter } from './components/DropDownFilter';
import FiltersSortButton from 'components/FiltersSort/components/FiltersSortButton';
import FiltersResetButton from 'components/FiltersSort/components/FiltersResetButton';

import { ColumnType } from 'helpers/types/model';
import { comparisonModeData } from './AnalysisFilters.helpers';

import { FilterIcon } from 'assets/icon/icon';

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
    setPeriod,
    lookback,
    setLookback,
    frequency,
    setFrequency,
    setFilters,
    setInitialFilters,
    filtersLength,
    reset,
    resetAll
  } = useContext(AnalysisContext);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [anchorElSortMenu, setAnchorElSortMenu] = useState<HTMLElement | null>(null);

  const {
    data: columns = {} as GetModelColumnsApiV1ModelsModelIdColumnsGet200,
    refetch,
    isLoading
  } = useGetModelColumnsApiV1ModelsModelIdColumnsGet(model.id, undefined, {
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
  };

  const handleOpenSortMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorElSortMenu(e.currentTarget);
  };

  const handleCloseSortMenu = () => {
    setAnchorElSortMenu(null);
  };

  useEffect(() => {
    const time = model.latest_time ? model.latest_time * 1000 : Date.now();
    setPeriod([new Date(time - lookback), new Date(time)]);
  }, [model, setPeriod, lookback]);

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
      setInitialFilters(currentFilters);
    }
  }, [columns, setFilters, setInitialFilters]);

  return (
    <>
      <Stack direction="row" alignItems="center">
        {fixedHeader && <StyledAnalysisFiltersDivider orientation="vertical" flexItem sx={{ ml: '5px' }} />}
        <Stack direction="row" alignItems="center" spacing="14px" marginRight={fixedHeader ? 'auto' : ''}>
          <SwitchButton checked={isComparisonModeOn} setChecked={setIsComparisonModeOn} label="Data comparison" />
          <MarkedSelect
            label="Comparison Mode"
            size="small"
            value={comparisonMode}
            onChange={handleComparisonModeChange}
            disabled={!isComparisonModeOn}
            sx={{ width: '176px' }}
          >
            {comparisonModeData.map(({ label, value }, index) => (
              <MenuItem key={`${value}${index}`} value={value}>
                {label}
              </MenuItem>
            ))}
          </MarkedSelect>
          <ExpandableSelection
            endTime={model.latest_time}
          />
          <MarkedSelect
            label="Frequency"
            size="small"
            value={frequency}
            onChange={handleFrequencyChange}
            sx={{ width: '176px' }}
          >
            {frequencyData.map(({ label, value }, index) => (
              <MenuItem key={`${value}${index}`} value={value}>
                {label}
              </MenuItem>
            ))}
          </MarkedSelect>
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
          {reset ? (
            fixedHeader ? (
              <FiltersResetButton title="Reset all" handleReset={resetAll} isLoading={isLoading} divider={false} />
            ) : (
              <Stack direction="row" spacing="11px">
                <FiltersResetButton title="Reset all" handleReset={resetAll} isLoading={isLoading} divider={false} />
                <StyledAnalysisFiltersDivider orientation="vertical" flexItem />
                <FiltersSortButton handleOpenSortMenu={handleOpenSortMenu} isLoading={isLoading} />
              </Stack>
            )
          ) : (
            !fixedHeader && <FiltersSortButton handleOpenSortMenu={handleOpenSortMenu} isLoading={isLoading} />
          )}
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
