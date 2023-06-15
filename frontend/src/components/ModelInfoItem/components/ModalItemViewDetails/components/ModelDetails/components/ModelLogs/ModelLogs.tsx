import React from 'react';
import { Table, TableBody, TableContainer, TableHead, TableRow } from '@mui/material';

import { IngestionErrorSchema } from 'api/generated';

import { StyledTableHeadCell } from '../../ModelDetails.style';
import { SingleLog } from './components/SingleLog';
import { StyledInput } from 'components/lib';

interface VersionErrorsListProps {
  logs: IngestionErrorSchema[] | undefined;
}

const tableHeaders = ['Version', 'Sample ID', 'Sample', 'Reason', 'Date'];

export const ModelLogs = ({ logs }: VersionErrorsListProps) => (
  <div>
    {logs && (
      <TableContainer sx={{ maxHeight: '539px', maxWidth: '100%' }}>
        <StyledInput
          value=""
          sx={{ margin: '16px 16px 8px', width: 'calc(100% - 36px)' }}
          placeholder="Search..."
          searchField
        />
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
