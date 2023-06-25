import React, { useState } from 'react';
import { TextField } from '@mui/material';

import { StyledLogsFiltersContainer, StyledDivider, StyledSearchBtn } from '../../../ModelDetails.style';
import { SelectPrimary, SelectPrimaryItem } from 'components/Select/SelectPrimary';
import { DatePicker } from 'components/base/DatePicker/DatePicker';
import { StyledInput } from 'components/lib';

interface LogsFiltersProps {
  modelVersions?: { name: string; id: number }[];
  version?: number;
  startDate: Date | undefined;
  endDate: Date | undefined;
  setVersion: (version: number) => void;
  setReason: (reason: string) => void;
  setStartDate: (date: Date) => void;
  setEndDate: (fate: Date) => void;
}

export const ModelLogsFilters = (props: LogsFiltersProps) => {
  const { modelVersions, version, startDate, endDate, setVersion, setReason, setStartDate, setEndDate } = props;

  const [searchInput, setSearchInput] = useState('');

  const handleStartDateChange = (currentStartDate: Date) => setStartDate(currentStartDate);

  const handleEndDateChange = (currentEndDate: Date) => setEndDate(currentEndDate);

  const handleIconClick = () => setReason(searchInput);

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
        inputFormat="l"
        onChange={handleStartDateChange}
        value={startDate}
        label="Start Date"
        disableMaskedInput
        renderInput={(alertFilters: any) => <TextField {...alertFilters} size="small" />}
      />
      -
      <DatePicker
        inputFormat="l"
        onChange={handleEndDateChange}
        value={endDate}
        label="End Date"
        disableMaskedInput
        renderInput={(alertFilters: any) => <TextField {...alertFilters} size="small" />}
      />
      <StyledDivider />
      <StyledSearchBtn onClick={handleIconClick} />
      <StyledInput
        value={searchInput}
        onChange={e => setSearchInput(e.target.value)}
        onCloseIconClick={() => setSearchInput('')}
        sx={{ width: '450px', height: '36px', borderRadius: '0 4px 4px 0' }}
        placeholder="Search reason..."
      />
    </StyledLogsFiltersContainer>
  );
};
