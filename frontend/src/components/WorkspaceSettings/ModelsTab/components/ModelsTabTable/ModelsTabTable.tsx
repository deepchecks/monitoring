import React from 'react';

import { ModelManagmentSchema } from 'api/generated';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import Paper from '@mui/material/Paper';

import { ModelsTabTableHead } from './ModelsTabTableHead';

import { StyledTableContainer } from '../../../WorkspaceSettings.styles';
import { ModelsTabTableRow } from './ModelsTabTableRow';

import { constants } from '../../modelsTab.constants';

interface ModelsTabTableProps {
  models: ModelManagmentSchema[];
}

export const ModelsTabTable = ({ models }: ModelsTabTableProps) => {
  return (
    <StyledTableContainer sx={{ height: 'calc(100vh - 283px)' }} component={Paper}>
      <Table stickyHeader sx={{ minWidth: 650 }} aria-label={constants.table.ariaLabel}>
        <ModelsTabTableHead />
        <TableBody>
          {models.map(m => (
            <ModelsTabTableRow key={m.id} model={m} />
          ))}
        </TableBody>
      </Table>
    </StyledTableContainer>
  );
};
