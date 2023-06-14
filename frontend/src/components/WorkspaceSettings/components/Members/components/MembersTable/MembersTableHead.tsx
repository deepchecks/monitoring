import React from 'react';

import TableHead, { TableHeadProps } from '@mui/material/TableHead';
import Checkbox from '@mui/material/Checkbox';

import { StyledTableRow, StyledTableCellBold } from '../../../../WorkspaceSettings.styles';

import { constants } from '../../members.constants';

interface MembersTableHeadProps extends TableHeadProps {
  numSelected: number;
  rowCount: number;
  selectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  modelAssignment: boolean | undefined;
}

const { name, email, activeSince, role, actions, modelAccess } = constants.table;

export const MembersTableHead = ({
  numSelected,
  rowCount,
  selectAllClick,
  modelAssignment,
  ...otherProps
}: MembersTableHeadProps) => (
  <TableHead {...otherProps}>
    <StyledTableRow>
      <StyledTableCellBold padding="checkbox">
        <Checkbox
          indeterminate={numSelected > 0 && numSelected < rowCount}
          checked={rowCount > 0 && numSelected === rowCount}
          onChange={selectAllClick}
        />
      </StyledTableCellBold>
      <StyledTableCellBold width="25%">{name}</StyledTableCellBold>
      <StyledTableCellBold width="25%">{email}</StyledTableCellBold>
      <StyledTableCellBold width="15%">{activeSince}</StyledTableCellBold>
      <StyledTableCellBold width="10%">{role}</StyledTableCellBold>
      {modelAssignment && (
        <StyledTableCellBold align="center" width="15%">
          {modelAccess}
        </StyledTableCellBold>
      )}
      <StyledTableCellBold align="right" width="10%">
        {actions}
      </StyledTableCellBold>
    </StyledTableRow>
  </TableHead>
);
