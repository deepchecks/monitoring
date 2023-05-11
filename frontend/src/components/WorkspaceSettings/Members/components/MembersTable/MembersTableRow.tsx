import React from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { MemberSchema } from 'api/generated';

import DeleteIcon from '@mui/icons-material/Delete';
import ModeEditIcon from '@mui/icons-material/ModeEdit';

import { StyledTableRow, StyledTableCell, StyledIconButton } from './MembersTable.style';

dayjs.extend(localizedFormat);

interface MembersTableRowProps {
  member: MemberSchema;
  editMember: (member: MemberSchema) => void;
  removeMember: (member: MemberSchema) => void;
}

export const MembersTableRow = ({ member, editMember, removeMember }: MembersTableRowProps) => {
  const { id, full_name, email, created_at } = member;

  return (
    <StyledTableRow key={id} sx={{ 'td, th': { border: 0 } }}>
      <StyledTableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
        {full_name || 'n/a'}
      </StyledTableCell>
      <StyledTableCell>{email}</StyledTableCell>
      <StyledTableCell>{dayjs(created_at).format('L')}</StyledTableCell>
      <StyledTableCell align="right">
        <StyledIconButton onClick={() => editMember(member)}>
          <ModeEditIcon />
        </StyledIconButton>
        <StyledIconButton onClick={() => removeMember(member)}>
          <DeleteIcon />
        </StyledIconButton>
      </StyledTableCell>
    </StyledTableRow>
  );
};
