import React, { useContext, useEffect, useMemo, useState, useRef } from 'react';

import {
  GetModelColumnsApiV1ModelsModelIdColumnsGet200,
  ModelManagmentSchema,
  useGetModelColumnsApiV1ModelsModelIdColumnsGet,
  useGetModelAutoFrequencyApiV1ModelsModelIdAutoFrequencyGet
} from 'api/generated';

import { AnalysisContext } from 'helpers/context/AnalysisProvider';

import { styled, Stack, StackProps } from '@mui/material';

import { DropDownFilter } from './components/DropDownFilter';
import { FiltersResetButton } from 'components/FiltersSort/components/FiltersResetButton';
import { DropdownTextField } from 'components/base/Input/DropdownTextField';
import { ActiveColumnsFilters } from 'components/ActiveColumnsFilters';
import { DropdownEndAdornment } from './components/DropdownEndAdornment';

import { ColumnType } from 'helpers/types/model';
// import { getStorageItem, storageKeys } from 'helpers/utils/localStorage';
import { FrequencyMap } from 'helpers/utils/frequency';
import { calculateInitialActiveFilters, calculateCurrentFilters } from './AnalysisFilters.helpers';

interface AnalysisFiltersProps extends StackProps {
  model: ModelManagmentSchema;
  fixedHeader?: boolean;
}

export function AnalysisFilters({ model, fixedHeader, ...props }: AnalysisFiltersProps) {
  const {
    setPeriod,
    setFrequency,
    setFilters,
    setInitialFilters,
    filtersLength,
    reset,
    resetAllFilters,
    setDefaultFrequency
  } = useContext(AnalysisContext);

  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const selectRef = useRef<HTMLDivElement>();

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
    () => Object.fromEntries(Object.entries(columnsMap).filter(([, value]) => value.type in ColumnType)),
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

  const handleFiltersOpen = () => {
    if (selectRef.current) {
      setAnchorEl(selectRef.current);
    }
  };

  useEffect(() => {
    // const storageFrequency = getStorageItem(storageKeys.analysisFrequency);
    //  const storagePeriod = getStorageItem(storageKeys.analysisPeriod);

    if (model.id != -1) {
      refetchColumns();
      loadDefaultFrequency();
      if (defaultFrequency) {
        setPeriod([new Date(defaultFrequency.start * 1000), new Date(defaultFrequency.end * 1000)]);
        setDefaultFrequency(defaultFrequency);
        setFrequency(FrequencyMap[defaultFrequency?.frequency]);
      }

      // if (storageFrequency !== 'null' && storageFrequency !== '0') {
      //   const frequencyNumber = Number(storageFrequency);
      //   setFrequency(frequencyNumber);
      // }

      // if (storagePeriod !== '' && storagePeriod !== 'null') {
      //   const parsedPeriod = JSON.parse(storagePeriod);
      //   setPeriod(parsedPeriod);
      // }
    }
  }, [model, refetchColumns, defaultFrequency, loadDefaultFrequency, setPeriod, setFrequency, setDefaultFrequency]);

  useEffect(() => {
    if (Object.keys(columns).length) {
      const currentFilters = calculateCurrentFilters(columns);

      setFilters(calculateInitialActiveFilters(currentFilters));
      setInitialFilters(currentFilters);
    }
  }, [columns]);

  return (
    <>
      <StyledContainer {...props}>
        <Stack
          direction="row"
          alignItems="center"
          spacing="10px"
          justifyContent={fixedHeader ? 'space-between' : 'start'}
          flex={1}
          ref={selectRef as any}
        >
          <StyledDropdownTextField
            onClick={handleFiltersOpen}
            value="Filter"
            InputProps={{
              endAdornment: <DropdownEndAdornment filtersLength={filtersLength} isDropdownOpen={!!anchorEl} />,
              readOnly: true
            }}
          />
          {!fixedHeader && <ActiveColumnsFilters />}
          {reset && (
            <FiltersResetButton
              title="Reset all filters"
              handleReset={resetAllFilters}
              isLoading={isLoading}
              divider={false}
            />
          )}
        </Stack>
      </StyledContainer>
      <DropDownFilter anchorEl={anchorEl} columns={columns} open={!!anchorEl} onClose={handleFiltersClose} />
    </>
  );
}

const StyledContainer = styled(Stack)({
  flexDirection: 'row',
  alignItems: 'center'
});

const StyledDropdownTextField = styled(DropdownTextField)({
  width: '122px'
});
