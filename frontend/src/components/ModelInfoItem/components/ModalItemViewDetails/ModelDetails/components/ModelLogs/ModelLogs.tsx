import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableContainer, TableHead, TableRow, TextField } from '@mui/material';

import { StyledDivider, StyledLogsFiltersContainer, StyledTableHeadCell } from '../../ModelDetails.style';
import { SingleLog } from './components/SingleLog';
import { StyledInput, StyledLoader } from 'components/lib';
import { DatePicker } from 'components/base/DatePicker/DatePicker';
import { SelectPrimary, SelectPrimaryItem } from 'components/Select/SelectPrimary';
import { NoDataToShow } from 'components/DiagramLine/NoData/NoDataToShow';

import {
  IngestionErrorSchema,
  retrieveConnectedModelIngestionErrorsApiV1ConnectedModelsModelIdIngestionErrorsGet,
  useGetVersionsPerModelApiV1ModelsModelIdVersionsGet
} from 'api/generated';

const constants = {
  tableHeaders: ['Version', 'Date', 'Reason', 'Sample ID', 'Sample'],
  notFoundMsg: 'No Log Data Found'
};

export const ModelLogs = ({ modelId }: { modelId: number }) => {
  const [logs, setLogs] = useState<IngestionErrorSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState<number>();
  const [reason, setReason] = useState('');
  const [endDate, setEndDate] = useState<Date>();
  const [startDate, setStartDate] = useState<Date>();

  const { data: modelVersions } = useGetVersionsPerModelApiV1ModelsModelIdVersionsGet(modelId);

  const getLogs = async () => {
    const response = await retrieveConnectedModelIngestionErrorsApiV1ConnectedModelsModelIdIngestionErrorsGet(modelId, {
      end_time_epoch: endDate && endDate.getTime(),
      start_time_epoch: startDate && startDate.getTime(),
      msg_contains: reason,
      model_version_id: version
    });

    if (response[0]) {
      setLogs(response);
      setIsLoading(false);
    } else {
      setLogs([]);
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    setIsLoading(true);
    const getFilteredLogs = setTimeout(() => getLogs(), 500);
    return () => clearTimeout(getFilteredLogs);
  }, [reason, startDate, endDate, version]);

  return (
    <div>
      <TableContainer sx={{ maxHeight: '540px' }}>
        <StyledLogsFiltersContainer>
          <SelectPrimary
            label="Version"
            onChange={e => setVersion(e.target.value as number)}
            value={version}
            size="small"
          >
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
        {isLoading ? (
          <StyledLoader sx={{ margin: '150px auto' }} />
        ) : logs && logs.length > 0 ? (
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {constants.tableHeaders.map((header: string) => (
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
        ) : (
          <NoDataToShow title={constants.notFoundMsg} height={250} margin="44px auto" />
        )}
      </TableContainer>
    </div>
  );
};
