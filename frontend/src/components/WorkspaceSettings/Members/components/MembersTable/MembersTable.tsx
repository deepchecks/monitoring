import React from 'react';

import { MemberSchema } from 'api/generated';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import Paper from '@mui/material/Paper';

import { MembersTableRow } from './MembersTableRow';

import { StyledTableRow, StyledTableCell } from './MembersTable.style';

import { MembersActionDialogOptions } from '../../Members.type';
import { constants } from '../../members.constants';

interface MembersTableProps {
  members: MemberSchema[];
  handleOpenActionDialog: (action: MembersActionDialogOptions, member?: MemberSchema | null) => void;
}

export const MembersTable = ({ members, handleOpenActionDialog }: MembersTableProps) => {
  const editMember = (member: MemberSchema) => handleOpenActionDialog(MembersActionDialogOptions.edit, member);

  const removeMember = (member: MemberSchema) => handleOpenActionDialog(MembersActionDialogOptions.remove, member);

  return (
    <TableContainer component={Paper} sx={{ boxShadow: 'none', maxHeight: 'calc(100vh - 237px)' }}>
      <Table stickyHeader sx={{ minWidth: 650 }} aria-label={constants.table.ariaLabel}>
        <TableHead>
          <StyledTableRow>
            <StyledTableCell width="35%">{constants.table.name}</StyledTableCell>
            <StyledTableCell width="35%">{constants.table.email}</StyledTableCell>
            <StyledTableCell width="20%">{constants.table.activeSince}</StyledTableCell>
            <StyledTableCell align="right" width="10%">
              {constants.table.actions}
            </StyledTableCell>
          </StyledTableRow>
        </TableHead>
        <TableBody>
          {members.map(member => (
            <MembersTableRow key={member.id} member={member} editMember={editMember} removeMember={removeMember} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
