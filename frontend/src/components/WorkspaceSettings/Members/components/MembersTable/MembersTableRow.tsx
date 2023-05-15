import React from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { MemberSchema } from 'api/generated';

import { Checkbox, TableRowProps } from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import ModeEditIcon from '@mui/icons-material/ModeEdit';

import { StyledTableRow, StyledTableCell, StyledIconButton } from './MembersTable.style';

dayjs.extend(localizedFormat);

interface MembersTableRowProps extends TableRowProps {
  member: MemberSchema;
  editMember: (member: MemberSchema) => void;
  removeMember: (member: MemberSchema) => void;
}

export const MembersTableRow = ({
  member,
  editMember,
  removeMember,
  selected,
  ...otherProps
}: MembersTableRowProps) => {
  const { id, full_name, email, created_at } = member;

  return (
    <StyledTableRow key={id} role="checkbox" hover {...otherProps}>
      <StyledTableCell padding="checkbox">
        <Checkbox checked={selected} />
      </StyledTableCell>
      <StyledTableCell component="th" scope="row">
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
