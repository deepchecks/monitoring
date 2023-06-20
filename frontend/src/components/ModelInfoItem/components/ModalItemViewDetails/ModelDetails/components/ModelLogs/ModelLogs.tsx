import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableContainer, TableHead, TableRow } from '@mui/material';

import { StyledTableHeadCell } from '../../ModelDetails.style';
import { SingleLog } from './components/SingleLog';
import { StyledLoader } from 'components/lib';
import { NoDataToShow } from 'components/DiagramLine/NoData/NoDataToShow';
import { ModelLogsFilters } from './components/ModelLogsFilters';

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

  useEffect(() => {
    setIsLoading(true);
    const getFilteredLogs = setTimeout(() => getLogs(), 500);
    return () => clearTimeout(getFilteredLogs);
  }, [reason, startDate, endDate, version]);

  return (
    <div>
      <TableContainer sx={{ maxHeight: '540px' }}>
        <ModelLogsFilters
          modelVersions={modelVersions}
          version={version}
          reason={reason}
          startDate={startDate}
          endDate={endDate}
          setVersion={setVersion}
          setReason={setReason}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
        {isLoading ? (
          <StyledLoader sx={{ margin: '150px auto' }} />
        ) : logs?.length > 0 ? (
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
              {logs.map((log, i) => (
                <SingleLog key={i} log={log} />
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
