import React from 'react';

import TableHead, { TableHeadProps } from '@mui/material/TableHead';

import { StyledTableRow, StyledTableCellBold } from '../../../../WorkspaceSettings.styles';

import { constants } from '../../modelsTab.constants';

const { actions, members, name } = constants.table;

export const ModelsTabTableHead = ({ ...props }: TableHeadProps) => (
  <TableHead {...props}>
    <StyledTableRow>
      <StyledTableCellBold width="45%">{name}</StyledTableCellBold>
      <StyledTableCellBold width="40%">{members}</StyledTableCellBold>
      <StyledTableCellBold align="right" width="15%">
        {actions}
      </StyledTableCellBold>
    </StyledTableRow>
  </TableHead>
);
