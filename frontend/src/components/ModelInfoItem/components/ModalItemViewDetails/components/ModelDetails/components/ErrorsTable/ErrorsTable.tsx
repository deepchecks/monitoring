import React from 'react';
import { Table, TableBody, TableContainer, TableHead, TableRow } from '@mui/material';

import { IngestionErrorSchema } from 'api/generated';

import { StyledTableHeadCell } from '../../ModelDetails.style';
import { SingleError } from './SingleError';

interface VersionErrorsListProps {
  errors: IngestionErrorSchema[] | undefined;
}

export const ErrorsTable = ({ errors }: VersionErrorsListProps) => (
  <>
    {errors ? (
      <TableContainer sx={{ maxHeight: '539px', maxWidth: '100%' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <StyledTableHeadCell width="20%">Version</StyledTableHeadCell>
              <StyledTableHeadCell width="20%">Sample ID</StyledTableHeadCell>
              <StyledTableHeadCell width="20%">Sample</StyledTableHeadCell>
              <StyledTableHeadCell width="20%">Reason of error</StyledTableHeadCell>
              <StyledTableHeadCell width="20%">Timestamp</StyledTableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {errors.map(error => (
              <SingleError key={`${error.id}-${error.sample_id}`} error={error} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    ) : (
      <div></div>
    )}
  </>
);
