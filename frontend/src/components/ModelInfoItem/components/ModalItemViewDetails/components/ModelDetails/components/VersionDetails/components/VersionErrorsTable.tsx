import React from 'react';
import { IngestionErrorSchema } from 'api/generated';
import { Table, TableBody, TableContainer, TableHead, TableRow } from '@mui/material';
import { StyledTableHeadCell } from '../../../ModelDetails.style';
import { SingleError } from './SingleError';

interface VersionErrorsListProps {
  errors: IngestionErrorSchema[] | undefined;
}

export const VersionErrorsTable = ({ errors }: VersionErrorsListProps) => (
  <>
    {errors ? (
      <TableContainer sx={{ maxHeight: '539px', maxWidth: '100%' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <StyledTableHeadCell width="12%">Sample ID</StyledTableHeadCell>
              <StyledTableHeadCell width="35%">Sample</StyledTableHeadCell>
              <StyledTableHeadCell width="30%">Reason of error</StyledTableHeadCell>
              <StyledTableHeadCell width="23%">Timestamp</StyledTableHeadCell>
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
