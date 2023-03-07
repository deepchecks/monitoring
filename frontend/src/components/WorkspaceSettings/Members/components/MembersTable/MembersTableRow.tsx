import React from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { MemberSchema } from 'api/generated';

import { StyledTableRow, StyledTableCell, StyledIconButton } from './MembersTable.style';

import { Edit, Trash } from 'assets/icon/icon';

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
          <Edit />
        </StyledIconButton>
        <StyledIconButton onClick={() => removeMember(member)}>
          <Trash />
        </StyledIconButton>
      </StyledTableCell>
    </StyledTableRow>
  );
};
