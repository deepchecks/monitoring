import React from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { ConnectedModelVersionSchema } from 'api/generated';

import { Table, TableBody, TableContainer, TableHead, TableRow } from '@mui/material';
import { StyledVersionsTableHeadCell } from '../../ModelDetails.style';
import { SingleVersion } from './components/SingleVersion';

dayjs.extend(localizedFormat);

interface VersionsTableProps {
  versions: ConnectedModelVersionSchema[] | undefined;
  onVersionDetailsOpen: (version: ConnectedModelVersionSchema) => void;
}

export const VersionsTable = ({ versions, onVersionDetailsOpen }: VersionsTableProps) => {
  return (
    <>
      {versions && (
        <TableContainer sx={{ maxHeight: '100%' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <StyledVersionsTableHeadCell width={343}>Version</StyledVersionsTableHeadCell>
                <StyledVersionsTableHeadCell width={286}>Last update</StyledVersionsTableHeadCell>
                <StyledVersionsTableHeadCell align={'center'} width={362}>
                  Pending rows
                </StyledVersionsTableHeadCell>
                <StyledVersionsTableHeadCell width={145}>Detailed errors</StyledVersionsTableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {versions.map(version => (
                <SingleVersion
                  key={`${version.id}-${version.name}`}
                  version={version}
                  onButtonClick={onVersionDetailsOpen}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};
