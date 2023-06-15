import React, { useState } from 'react';
import { Table, TableBody, TableContainer, TableHead, TableRow, TextField } from '@mui/material';

import { IngestionErrorSchema } from 'api/generated';

import { StyledDivider, StyledLogsFiltersContainer, StyledTableHeadCell } from '../../ModelDetails.style';
import { SingleLog } from './components/SingleLog';
import { StyledInput } from 'components/lib';
import { DatePicker } from 'components/base/DatePicker/DatePicker';
import { SelectPrimary, SelectPrimaryItem } from 'components/Select/SelectPrimary';

interface VersionErrorsListProps {
  logs: IngestionErrorSchema[] | undefined;
}

const tableHeaders = ['Version', 'Date', 'Reason', 'Sample ID', 'Sample'];

export const ModelLogs = ({ logs }: VersionErrorsListProps) => {
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState<Date | null>();
  const [endDate, setEndDate] = useState<Date | null>();
  const [version, setVersion] = useState('');

  const handleStartDateChange = (currentStartDate: Date | null) => {
    if (currentStartDate && endDate && currentStartDate < endDate) {
      setStartDate(currentStartDate);
    }
  };

  const handleEndDateChange = (currentEndDate: Date | null) => {
    if (currentEndDate && startDate && currentEndDate > startDate) {
      setEndDate(currentEndDate);
    }
  };

  return (
    <div>
      {logs && (
        <TableContainer sx={{ maxHeight: '539px', maxWidth: '100%' }}>
          <StyledLogsFiltersContainer>
            <SelectPrimary
              label="Version"
              onChange={e => setVersion(e.target.value as string)}
              value={version}
              size="small"
            >
              {['version1', 'version2'].map(value => (
                <SelectPrimaryItem value={value} key={value}>
                  {value}
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
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {tableHeaders.map((header: string) => (
                  <StyledTableHeadCell key={header} width="20%">
                    {header}
                  </StyledTableHeadCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map(log => (
                <SingleLog key={`${log.id}-${log.sample_id}`} log={log} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
};
