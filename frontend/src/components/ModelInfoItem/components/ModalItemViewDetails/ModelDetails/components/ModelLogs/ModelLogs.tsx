import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
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
  tableHeaders: ['Version ID', 'Date', 'Reason', 'Sample ID', 'Sample'],
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
      end_time_epoch: endDate && dayjs(endDate).unix(),
      start_time_epoch: startDate && dayjs(startDate).unix(),
      msg_contains: reason,
      model_version_id: version
    });

    setLogs(response[0] ? response : []);
    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    getLogs();
  }, [reason, startDate, endDate, version]);

  return (
    <>
      <ModelLogsFilters
        modelVersions={modelVersions}
        version={version}
        startDate={startDate}
        endDate={endDate}
        setVersion={setVersion}
        setReason={setReason}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
      />
      <TableContainer sx={{ maxHeight: '500px' }}>
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
    </>
  );
};
