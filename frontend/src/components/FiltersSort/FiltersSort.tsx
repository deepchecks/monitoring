import React, { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import mixpanel from 'mixpanel-browser';

import { GlobalStateContext } from 'context';

import {
  AlertSeverity,
  GetAlertRulesApiV1AlertRulesGetParams,
  GetAlertRulesApiV1AlertRulesGetSortbyItem,
  useGetModelsApiV1ModelsGet
} from 'api/generated';

import { Box, Divider, Menu, MenuItem, SelectChangeEvent, Stack, styled, TextField, Typography } from '@mui/material';

import { DatePicker } from '../DatePicker/DatePicker';
import { SelectPrimary } from '../SelectPrimary/SelectPrimary';
import { SelectSeverity, SeverityAll, severityAll } from '../SelectSeverity';
import FiltersResetButton from './components/FiltersResetButton';
import FiltersSortButton from './components/FiltersSortButton';

import { colors } from 'theme/colors';
import useModels from 'hooks/useModels';

export type AlertsFiltersProps = {
  isFilterByTimeLine?: boolean;
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

const trackFiltersAndSortChange = (path: string) =>
  mixpanel.track(`${path === '/alerts' ? 'Alerts' : 'Alerts Rules'}: changed filters & sort`);

export const FiltersSort = ({ isFilterByTimeLine = true }: AlertsFiltersProps) => {
  const { pathname } = useLocation();
  const { alertFilters, changeAlertFilters, resetFilters } = useContext(GlobalStateContext);

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

  const handleOpenSortMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorElSortMenu(event.currentTarget);
  };

  const handleModelChange = (event: SelectChangeEvent<number | unknown>) => {
    trackFiltersAndSortChange(pathname);

    const currentModel = event.target.value as number;
    setModel(currentModel);

    if (currentModel === -1 && alertFilters.models) {
      changeAlertFilters(prevAlertFilters => {
        const currentParams = { ...prevAlertFilters };
        delete currentParams.models;
        return currentParams;
      });
      return;
    }

    changeAlertFilters(prevAlertFilters => ({ ...prevAlertFilters, models: [currentModel] }));
  };

  const handleSeverityChange = (event: SelectChangeEvent<unknown>) => {
    trackFiltersAndSortChange(pathname);

    const currentSeverity = event.target.value as AlertSeverity | SeverityAll;
    setSeverity(currentSeverity);

    if (currentSeverity === severityAll && alertFilters.severity) {
      changeAlertFilters(prevAlertFilters => {
        const currentParams = { ...prevAlertFilters };
        delete currentParams.severity;
        return currentParams;
      });
      return;
    }

    changeAlertFilters(
      prevAlertFilters =>
        ({
          ...prevAlertFilters,
          severity: [currentSeverity]
        } as GetAlertRulesApiV1AlertRulesGetParams)
    );
  };

  const handleStartDateChange = (currentStartDate: Date | null) => {
    if (currentStartDate && startDate && currentStartDate < startDate) {
      setStartDate(currentStartDate);
      changeAlertFilters(prevAlertFilters => ({
        ...prevAlertFilters,
        start: currentStartDate.toISOString()
      }));

      trackFiltersAndSortChange(pathname);
    }
  };

  const handleEndDateChange = (currentEndDate: Date | null) => {
    if (currentEndDate && startDate && currentEndDate > startDate) {
      setEndDate(currentEndDate);
      changeAlertFilters(prevAlertFilters => ({
        ...prevAlertFilters,
        end: currentEndDate.toISOString()
      }));

      trackFiltersAndSortChange(pathname);
    }
  };

  const onSort = (sortMethod: GetAlertRulesApiV1AlertRulesGetSortbyItem, sort: sortOptionsVariants) => {
    setSelectedSortVariant(sort);

    changeAlertFilters(prevAlertFilters => {
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

    trackFiltersAndSortChange(pathname);
  };

  const handleReset = () => {
    trackFiltersAndSortChange(pathname);
    resetFilters();
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
    changeAlertFilters(prevAlertFilters => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { start, end, ...newFilters } = prevAlertFilters;
      return newFilters;
    });
  }, [isFilterByTimeLine]);

  return (
    <>
      <StyledMainWrapper>
        <Stack direction="row">
          {isFilterByTimeLine && (
            <>
              <StyledDateWrapper>
                <DatePicker
                  inputFormat="DD MMM YYYY"
                  onChange={handleStartDateChange}
                  value={startDate}
                  label="Start Date"
                  disableMaskedInput
                  disabled={isModelsLoading}
                  renderInput={alertFilters => <TextField {...alertFilters} size="small" />}
                />
                -
                <DatePicker
                  inputFormat="DD MMM YYYY"
                  onChange={handleEndDateChange}
                  value={endDate}
                  label="End Date"
                  disableMaskedInput
                  disabled={isModelsLoading}
                  renderInput={alertFilters => <TextField {...alertFilters} size="small" />}
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

        {filtered ? (
          <Stack direction="row" spacing="11px">
            <FiltersResetButton handleReset={handleReset} isLoading={isModelsLoading} />
            <FiltersSortButton handleOpenSortMenu={handleOpenSortMenu} isLoading={isModelsLoading} />
          </Stack>
        ) : (
          <FiltersSortButton handleOpenSortMenu={handleOpenSortMenu} isLoading={isModelsLoading} />
        )}
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
            <Typography 
              variant="subtitle2"
              sx={{fontSize: 14}}
            >
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
  color: sort === sortMethod ? colors.primary.violet[400] : colors.neutral.darkText,
  py: '12px',
  pl: '12px'
}));
