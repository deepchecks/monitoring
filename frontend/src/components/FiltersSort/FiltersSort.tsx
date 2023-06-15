import React, { useEffect, useState } from 'react';

import {
  AlertSeverity,
  GetAlertRulesApiV1AlertRulesGetParams,
  GetAlertRulesApiV1AlertRulesGetSortbyItem
} from 'api/generated';

import { Box, Divider, Menu, MenuItem, SelectChangeEvent, Stack, styled, TextField, Typography } from '@mui/material';

import { DatePicker } from '../base/DatePicker/DatePicker';
import { SelectPrimary } from '../Select/SelectPrimary';
import { SelectSeverity, SeverityAll, severityAll } from '../Select/SelectSeverity';
import { FiltersResetButton } from './components/FiltersResetButton';
import { theme } from 'components/lib/theme';

import useModels from 'helpers/hooks/useModels';
import { resetAlertFilters } from 'helpers/base/alertFilters';
import { handleSetParams } from 'helpers/utils/getParams';

export type AlertsFiltersProps = {
  isFilterByTimeLine?: boolean;
  alertFilters: GetAlertRulesApiV1AlertRulesGetParams;
  setAlertFilters: React.Dispatch<React.SetStateAction<GetAlertRulesApiV1AlertRulesGetParams>>;
};

export enum sortOptionsVariants {
  AZ = 'Alphabetically A-Z',
  ZA = 'Alphabetically Z-A'
}

const oneYear = 60 * 60 * 24 * 365 * 1000;

const initStartDate = new Date(Date.now() - oneYear);
const initEndDate = new Date(Date.now());

const sortMethodMap = {
  [sortOptionsVariants.AZ]: 'severity:asc',
  [sortOptionsVariants.ZA]: 'severity:desc'
} as const;

export const sortOptions = [sortOptionsVariants.AZ, sortOptionsVariants.ZA] as const;

export const FiltersSort = ({ alertFilters, setAlertFilters, isFilterByTimeLine = true }: AlertsFiltersProps) => {
  const [startDate, setStartDate] = useState<Date | null>(initStartDate);
  const [endDate, setEndDate] = useState<Date | null>(initEndDate);
  const [model, setModel] = useState<number>(-1);
  const [severity, setSeverity] = useState<AlertSeverity | SeverityAll>(severityAll);
  const [anchorElSortMenu, setAnchorElSortMenu] = useState<null | HTMLElement>(null);
  const [selectedSortVariant, setSelectedSortVariant] = useState<sortOptionsVariants | ''>('');

  const filtered = endDate !== initEndDate || startDate !== initStartDate || model !== -1 || severity !== severityAll;
  const openSortMenu = Boolean(anchorElSortMenu);

  const { models = [], isLoading: isModelsLoading } = useModels();

  const handleCloseSortMenu = () => {
    setAnchorElSortMenu(null);
  };

  const handleModelChange = (event: SelectChangeEvent<number | unknown>) => {
    const currentModel = event.target.value as number;
    setModel(currentModel);

    if (currentModel === -1 && alertFilters.models) {
      setAlertFilters(prevAlertFilters => {
        const currentParams = { ...prevAlertFilters };
        delete currentParams.models;
        return currentParams;
      });
      handleSetParams('modelId');
      return;
    }
    handleSetParams('modelId', currentModel);
    setAlertFilters(prevAlertFilters => ({ ...prevAlertFilters, models: [currentModel] }));
  };

  const handleSeverityChange = (event: SelectChangeEvent<unknown>) => {
    const currentSeverity = event.target.value as AlertSeverity | SeverityAll;
    setSeverity(currentSeverity);

    if (currentSeverity === severityAll && alertFilters.severity) {
      setAlertFilters(prevAlertFilters => {
        const currentParams = { ...prevAlertFilters };
        delete currentParams.severity;
        return currentParams;
      });
      handleSetParams('severity');
      return;
    }

    setAlertFilters(
      prevAlertFilters =>
        ({
          ...prevAlertFilters,
          severity: [currentSeverity]
        } as GetAlertRulesApiV1AlertRulesGetParams)
    );
    handleSetParams('severity', currentSeverity);
  };

  const handleStartDateChange = (currentStartDate: Date | null) => {
    if (currentStartDate && endDate && currentStartDate < endDate) {
      setStartDate(currentStartDate);
      setAlertFilters(prevAlertFilters => ({
        ...prevAlertFilters,
        start: currentStartDate.toISOString()
      }));
    }
  };

  const handleEndDateChange = (currentEndDate: Date | null) => {
    if (currentEndDate && startDate && currentEndDate > startDate) {
      setEndDate(currentEndDate);
      setAlertFilters(prevAlertFilters => ({
        ...prevAlertFilters,
        end: currentEndDate.toISOString()
      }));
    }
  };

  const onSort = (sortMethod: GetAlertRulesApiV1AlertRulesGetSortbyItem, sort: sortOptionsVariants) => {
    setSelectedSortVariant(sort);

    setAlertFilters(prevAlertFilters => {
      const currentAlertFilters = { ...prevAlertFilters };

      if (prevAlertFilters.sortby) {
        delete currentAlertFilters.sortby;
        return currentAlertFilters;
      }

      return {
        ...prevAlertFilters,
        sortby: [sortMethod]
      } as GetAlertRulesApiV1AlertRulesGetParams;
    });

    handleCloseSortMenu();
  };

  const handleReset = () => {
    resetAlertFilters(setAlertFilters);
  };

  useEffect(() => {
    if (alertFilters.models) {
      const [currentModel] = alertFilters.models;

      if (currentModel !== model) {
        setModel(currentModel);
      }
    }
  }, [alertFilters.models]);

  useEffect(() => {
    if (alertFilters.models && alertFilters.models[0] !== model) {
      const [currentModel] = alertFilters.models;
      setModel(currentModel ? currentModel : -1);
    }

    if (alertFilters.severity && alertFilters.severity[0] !== severity) {
      const [currentSeverity] = alertFilters.severity;
      setSeverity(currentSeverity ? currentSeverity : severityAll);
    }

    if (alertFilters.start) {
      const currentStart = alertFilters.start;
      const currentStartDate = new Date(currentStart);

      if (currentStartDate !== startDate) {
        setStartDate(currentStartDate ? currentStartDate : initStartDate);
      }
    } else {
      setStartDate(initStartDate);
    }

    if (alertFilters.end) {
      const currentEnd = alertFilters.end;
      const currentEndDate = new Date(currentEnd);

      if (currentEndDate !== endDate) {
        setEndDate(currentEndDate ? currentEndDate : initEndDate);
      }
    } else {
      setEndDate(initEndDate);
    }
  }, [alertFilters.start, alertFilters.severity, alertFilters.end, alertFilters.models]);

  useEffect(() => {
    if (isFilterByTimeLine) return;
    setAlertFilters(prevAlertFilters => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { start, end, ...newFilters } = prevAlertFilters;
      return newFilters;
    });
  }, [isFilterByTimeLine]);

  return (
    <>
      <StyledMainWrapper>
        <Stack direction="row" flexWrap="wrap" gap="16px">
          {isFilterByTimeLine && (
            <>
              <StyledDateWrapper>
                <DatePicker
                  inputFormat="L"
                  onChange={handleStartDateChange}
                  value={startDate}
                  label="Start Date"
                  disableMaskedInput
                  disabled={isModelsLoading}
                  renderInput={(alertFilters: any) => <TextField {...alertFilters} size="small" />}
                />
                -
                <DatePicker
                  inputFormat="L"
                  onChange={handleEndDateChange}
                  value={endDate}
                  label="End Date"
                  disableMaskedInput
                  disabled={isModelsLoading}
                  renderInput={(alertFilters: any) => <TextField {...alertFilters} size="small" />}
                />
              </StyledDateWrapper>
              <StyledDivider orientation="vertical" flexItem />
            </>
          )}
          <Stack direction="row" spacing="16px">
            <SelectPrimary
              label="Model"
              onChange={handleModelChange}
              size="small"
              value={model}
              disabled={isModelsLoading}
            >
              <MenuItem value={-1}>All</MenuItem>
              {models.map(({ id, name }) => (
                <MenuItem value={id} key={id}>
                  {name}
                </MenuItem>
              ))}
            </SelectPrimary>
            <SelectSeverity
              allowAll
              onChange={handleSeverityChange}
              size="small"
              value={severity}
              disabled={isModelsLoading}
            />
          </Stack>
        </Stack>
        {filtered && <FiltersResetButton handleReset={handleReset} isLoading={isModelsLoading} divider={false} />}
      </StyledMainWrapper>
      <Menu
        anchorEl={anchorElSortMenu}
        open={openSortMenu}
        onClose={handleCloseSortMenu}
        MenuListProps={{
          'aria-labelledby': 'basic-button'
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        {sortOptions.map(sort => (
          <StyledSortMenuItem
            sort={sort}
            sortMethod={selectedSortVariant}
            key={sort}
            onClick={() => onSort(sortMethodMap[sort], sort)}
          >
            <Typography variant="subtitle2" sx={{ fontSize: 14 }}>
              {sort}
            </Typography>
          </StyledSortMenuItem>
        ))}
      </Menu>
    </>
  );
};

const StyledMainWrapper = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
});

const StyledDateWrapper = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: 353
});

const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: '0 18px',
  borderColor: theme.palette.grey[200]
}));

interface StyledSortMenuItemProps {
  sort: string;
  sortMethod: sortOptionsVariants | '';
}

const StyledSortMenuItem = styled(MenuItem, {
  shouldForwardProp: prop => prop !== 'sort' && prop !== 'sortMethod'
})<StyledSortMenuItemProps>(({ sort, sortMethod }) => ({
  color: sort === sortMethod ? theme.palette.primary.main : theme.palette.text.primary,
  py: '12px',
  pl: '12px'
}));
