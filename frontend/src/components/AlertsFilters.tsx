import { Box, Button, Divider, MenuItem, SelectChangeEvent, Stack, styled, TextField } from '@mui/material';
import { AlertSeverity, GetAlertRulesApiV1AlertRulesGetParams, useGetModelsApiV1ModelsGet } from 'api/generated';
import { GlobalStateContext } from 'Context';
import React, { useContext, useEffect, useState } from 'react';
import { Sort } from '../assets/icon/icon';
import { DatePicker } from './DatePicker/DatePicker';
import { SelectPrimary } from './SelectPrimary/SelectPrimary';

export type AlertsFiltersProps = {
  onChange: (alertFilters: GetAlertRulesApiV1AlertRulesGetParams) => void;
};

const severityList = [
  { label: 'All', value: 'All' },
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Mid', value: 'mid' },
  { label: 'Low', value: 'low' }
];

const oneYear = 60 * 60 * 24 * 365 * 1000;

const initStartDate = new Date(Date.now() - oneYear);
const initEndDate = new Date(Date.now());

export const AlertsFilters = () => {
  const { alertFilters, changeAlertFilters } = useContext(GlobalStateContext);
  const [startDate, setStartDate] = useState<Date | null>(
    alertFilters?.start ? new Date(alertFilters?.start) : initStartDate
  );
  const [endDate, setEndDate] = useState<Date | null>(alertFilters?.end ? new Date(alertFilters?.end) : initEndDate);

  const [model, setModel] = useState<number>(-1);
  const [severity, setSeverity] = useState<AlertSeverity | 'All'>('All');

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
    const currentSeverity = event.target.value as AlertSeverity | 'All';
    setSeverity(currentSeverity);

    if (currentSeverity === 'All' && alertFilters.severity) {
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
    if (alertFilters.severity) {
      const [currentSeverity] = alertFilters.severity;
      if (currentSeverity !== severity) {
        setSeverity(currentSeverity);
      }
    }
  }, [alertFilters.severity]);

  return (
    <StyledMainWrapper>
      <Stack direction="row">
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
          <SelectPrimary
            label="Severity"
            onChange={handleSeverityChange}
            size="small"
            value={severity}
            disabled={isModelsLoading}
          >
            {severityList.map(({ label, value }) => (
              <MenuItem value={value} key={label}>
                {label}
              </MenuItem>
            ))}
          </SelectPrimary>
        </Stack>
      </Stack>
      <Button variant="text" startIcon={<Sort />} onClick={onSort} disabled={isModelsLoading}>
        Sort
      </Button>
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
