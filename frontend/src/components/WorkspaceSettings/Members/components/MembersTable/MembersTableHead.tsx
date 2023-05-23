import React from 'react';

import TableHead, { TableHeadProps } from '@mui/material/TableHead';
import Checkbox from '@mui/material/Checkbox';

import { StyledTableRow, StyledTableCell } from '../../../WorkspaceSettings.styles';

import { constants } from '../../members.constants';

interface MembersTableHeadProps extends TableHeadProps {
  numSelected: number;
  rowCount: number;
  selectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const { name, email, activeSince, role, actions } = constants.table;

export const MembersTableHead = ({ numSelected, rowCount, selectAllClick, ...otherProps }: MembersTableHeadProps) => (
  <TableHead {...otherProps}>
    <StyledTableRow>
      <StyledTableCell padding="checkbox">
        <Checkbox
          indeterminate={numSelected > 0 && numSelected < rowCount}
          checked={rowCount > 0 && numSelected === rowCount}
          onChange={selectAllClick}
        />
      </StyledTableCell>
      <StyledTableCell width="30%">{name}</StyledTableCell>
      <StyledTableCell width="30%">{email}</StyledTableCell>
      <StyledTableCell width="15%">{activeSince}</StyledTableCell>
      <StyledTableCell width="15%">{role}</StyledTableCell>
      <StyledTableCell align="right" width="10%">
        {actions}
      </StyledTableCell>
    </StyledTableRow>
  </TableHead>
);
