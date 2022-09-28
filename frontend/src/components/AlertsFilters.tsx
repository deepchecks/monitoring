import { Box, Button, Divider, MenuItem, SelectChangeEvent, Stack, styled, TextField } from '@mui/material';
import { AlertSeverity, GetAlertRulesApiV1AlertRulesGetParams, useGetModelsApiV1ModelsGet } from 'api/generated';
import { GlobalStateContext } from 'Context';
import React, { useContext, useEffect, useState } from 'react';
import { Sort, Undo } from '../assets/icon/icon';
import { DatePicker } from './DatePicker/DatePicker';
import { SelectPrimary } from './SelectPrimary/SelectPrimary';
import { SelectSeverity, SeverityAll, severityAll } from './SelectSeverity';

export type AlertsFiltersProps = {
  isFilterByTimeLine?: boolean;
};

const oneYear = 60 * 60 * 24 * 365 * 1000;

const initStartDate = new Date(Date.now() - oneYear);
const initEndDate = new Date(Date.now());

export const AlertsFilters = ({ isFilterByTimeLine = true }: AlertsFiltersProps) => {
  const { alertFilters, changeAlertFilters, resetFilters } = useContext(GlobalStateContext);
  const [startDate, setStartDate] = useState<Date | null>(initStartDate);
  const [endDate, setEndDate] = useState<Date | null>(initEndDate);

  const [model, setModel] = useState<number>(-1);
  const [severity, setSeverity] = useState<AlertSeverity | SeverityAll>(severityAll);
  const filtered = endDate !== initEndDate || startDate !== initStartDate || model !== -1 || severity !== severityAll;

  const { data: models = [], isLoading: isModelsLoading } = useGetModelsApiV1ModelsGet();

  const handleModelChange = (event: SelectChangeEvent<number | unknown>) => {
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
    }
  };

  const handleEndDateChange = (currentEndDate: Date | null) => {
    if (currentEndDate && startDate && currentEndDate > startDate) {
      setEndDate(currentEndDate);
      changeAlertFilters(prevAlertFilters => ({
        ...prevAlertFilters,
        end: currentEndDate.toISOString()
      }));
    }
  };

  const onSort = () => {
    changeAlertFilters(prevAlertFilters => {
      const currentAlertFilters = { ...prevAlertFilters };

      if (prevAlertFilters.sortby) {
        delete currentAlertFilters.sortby;
        return currentAlertFilters;
      }

      return {
        ...prevAlertFilters,
        sortby: ['severity:asc']
      } as GetAlertRulesApiV1AlertRulesGetParams;
    });
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
          <Button
            variant="text"
            startIcon={<Undo />}
            onClick={resetFilters}
            disabled={isModelsLoading}
            sx={{ minHeight: 30 }}
          >
            Reset
          </Button>
          <Divider
            orientation="vertical"
            flexItem
            sx={theme => ({
              borderColor: theme.palette.grey[300],
              alignSelf: 'center',
              height: 24
            })}
          />
          <Button
            variant="text"
            startIcon={<Sort />}
            onClick={onSort}
            disabled={isModelsLoading}
            sx={{ minHeight: 30 }}
          >
            Sort
          </Button>
        </Stack>
      ) : (
        <Button variant="text" startIcon={<Sort />} onClick={onSort} disabled={isModelsLoading} sx={{ minHeight: 30 }}>
          Sort
        </Button>
      )}
    </StyledMainWrapper>
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
