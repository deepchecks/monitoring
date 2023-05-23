import React from 'react';

import TableHead, { TableHeadProps } from '@mui/material/TableHead';

import { StyledTableRow, StyledTableCell } from '../../../WorkspaceSettings.styles';

import { constants } from '../../modelsTab.constants';

const { actions, members, name } = constants.table;

export const ModelsTabTableHead = ({ ...props }: TableHeadProps) => (
  <TableHead {...props}>
    <StyledTableRow>
      <StyledTableCell width="45%">{name}</StyledTableCell>
      <StyledTableCell width="45%">{members}</StyledTableCell>
      <StyledTableCell align="right" width="10%">
        {actions}
      </StyledTableCell>
    </StyledTableRow>
  </TableHead>
);
