import React, { useEffect, useState } from 'react';
import { Button, MenuItem, SelectChangeEvent, Stack, TextField, Box, Divider } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { Sort } from '../assets/icon/icon';
import { DatePicker } from './DatePicker/DatePicker';
import { SelectPrimary } from './SelectPrimary/SelectPrimary';
import { styled } from '@mui/material';
import {
  GetAlertRulesApiV1AlertRulesGetParams,
  GetAlertRulesApiV1AlertRulesGetSortbyItem,
  AlertSeverity,
  useGetModelsApiV1ModelsGet
} from 'api/generated';

export type AlertsFiltersProps = {
  onChange: (params: GetAlertRulesApiV1AlertRulesGetParams) => void;
};

const severityList = [
  { label: 'All', value: 'All' },
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Mid', value: 'mid' },
  { label: 'Low', value: 'low' }
];

export const AlertsFilters = ({ onChange }: AlertsFiltersProps) => {
  const location = useLocation();
  const state = location.state as { modelId: number } | null;
  const [startDate, setStartDate] = useState<Date | null>(new Date(Date.now() - 60 * 60 * 24 * 365 * 1000));
  const [endDate, setEndDate] = useState<Date | null>(new Date(Date.now()));
  const [sortedBy, setSortedBy] = useState<GetAlertRulesApiV1AlertRulesGetSortbyItem | null>(null);
  const [params, setParams] = useState<GetAlertRulesApiV1AlertRulesGetParams>(() => {
    const options: GetAlertRulesApiV1AlertRulesGetParams = {};
    if (state) {
      options.models = [state.modelId];
    }
    return {
      start: startDate?.toISOString(),
      end: endDate?.toISOString(),
      ...options
    };
  });

  const [model, setModel] = useState<number>(state ? state.modelId : -1);
  const [severity, setSeverity] = useState<AlertSeverity | 'All'>('All');

  const { data: models = [], isLoading: isModelsLoading } = useGetModelsApiV1ModelsGet();

  const handleModelChange = (event: SelectChangeEvent<number | unknown>) => {
    const currentModel = event.target.value as number;
    setModel(currentModel);
    if (currentModel === -1 && params.models) {
      setParams(prevParams => {
        const currentParams = { ...prevParams };
        delete currentParams.models;
        return currentParams;
      });
      return;
    }
    setParams(prevParams => ({ ...prevParams, models: [currentModel] }));
  };

  const handleSeverityChange = (event: SelectChangeEvent<unknown>) => {
    const currentSeverity = event.target.value as AlertSeverity | 'All';
    setSeverity(currentSeverity);
    if (currentSeverity === 'All' && params.severity) {
      setParams(prevParams => {
        const currentParams = { ...prevParams };
        delete currentParams.severity;
        return currentParams;
      });
      return;
    }
    setParams(
      prevParams =>
        ({
          ...prevParams,
          severity: [currentSeverity]
        } as GetAlertRulesApiV1AlertRulesGetParams)
    );
  };

  const handleStartDateChange = (currentStartDate: Date | null) => {
    if (currentStartDate && startDate && currentStartDate < startDate) {
      setStartDate(currentStartDate);
      setParams(prevParams => ({
        ...prevParams,
        start: currentStartDate.toISOString()
      }));
    }
  };

  const handleEndDateChange = (currentEndDate: Date | null) => {
    if (currentEndDate && startDate && currentEndDate > startDate) {
      setEndDate(currentEndDate);
      setParams(prevParams => ({
        ...prevParams,
        end: currentEndDate.toISOString()
      }));
    }
  };

  const onSort = () => {
    let sort: GetAlertRulesApiV1AlertRulesGetSortbyItem | null = null;
    setSortedBy(prevSortedBy => {
      if (prevSortedBy) {
        return sort;
      }
      sort = 'severity:asc';
      return sort;
    });

    if (sort) {
      setParams(
        prevParams =>
          ({
            ...prevParams,
            sortby: [sort]
          } as GetAlertRulesApiV1AlertRulesGetParams)
      );
      return;
    }

    setParams(prevParams => {
      const currentParams = { ...prevParams };
      delete currentParams.sortby;
      return currentParams;
    });
  };

  useEffect(() => {
    onChange(params);
  }, [model, severity, startDate, endDate, sortedBy]);

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
            renderInput={params => <TextField {...params} size="small" />}
          />
          -
          <DatePicker
            inputFormat="DD MMM YYYY"
            onChange={handleEndDateChange}
            value={endDate}
            label="End Date"
            disableMaskedInput
            disabled={isModelsLoading}
            renderInput={params => <TextField {...params} size="small" />}
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
