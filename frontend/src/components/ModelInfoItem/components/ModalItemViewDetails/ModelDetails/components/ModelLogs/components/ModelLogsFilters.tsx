import React from 'react';
import { TextField } from '@mui/material';

import { StyledLogsFiltersContainer, StyledDivider } from '../../../ModelDetails.style';
import { SelectPrimary, SelectPrimaryItem } from 'components/Select/SelectPrimary';
import { DatePicker } from 'components/base/DatePicker/DatePicker';
import { StyledInput } from 'components/lib';

interface LogsFiltersProps {
  modelVersions?: { name: string; id: number }[];
  version?: number;
  reason: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  setVersion: (version: number) => void;
  setReason: (reason: string) => void;
  setStartDate: (date: Date) => void;
  setEndDate: (fate: Date) => void;
}

export const ModelLogsFilters = (props: LogsFiltersProps) => {
  const { modelVersions, version, reason, startDate, endDate, setVersion, setReason, setStartDate, setEndDate } = props;

  const handleStartDateChange = (currentStartDate: Date) => {
    if (currentStartDate && endDate && currentStartDate < endDate) {
      setStartDate(currentStartDate);
    }
  };

  const handleEndDateChange = (currentEndDate: Date) => {
    if (currentEndDate && startDate && currentEndDate > startDate) {
      setEndDate(currentEndDate);
    }
  };

  return (
    <StyledLogsFiltersContainer>
      <SelectPrimary label="Version" onChange={e => setVersion(e.target.value as number)} value={version} size="small">
        {modelVersions &&
          modelVersions.map(({ name, id }) => (
            <SelectPrimaryItem value={id} key={id}>
              {name}
            </SelectPrimaryItem>
          ))}
      </SelectPrimary>
      <StyledDivider />
      <DatePicker
        inputFormat="L"
        onChange={handleStartDateChange}
        value={startDate}
        label="Start Date"
        disableMaskedInput
        renderInput={(alertFilters: any) => <TextField {...alertFilters} size="small" />}
      />
      -
      <DatePicker
        inputFormat="L"
        onChange={handleEndDateChange}
        value={endDate}
        label="End Date"
        disableMaskedInput
        renderInput={(alertFilters: any) => <TextField {...alertFilters} size="small" />}
      />
      <StyledDivider />
      <StyledInput
        value={reason}
        onChange={e => setReason(e.target.value)}
        onCloseIconClick={() => setReason('')}
        sx={{ width: '500px', height: '36px' }}
        placeholder="Search reason..."
      />
    </StyledLogsFiltersContainer>
  );
};
