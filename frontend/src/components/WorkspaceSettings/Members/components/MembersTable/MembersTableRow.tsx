import React from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { MemberSchema, RoleEnum } from 'api/generated';

import { Checkbox, TableRowProps } from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import ModeEditIcon from '@mui/icons-material/ModeEdit';

import { StyledTableRow, StyledTableCell, StyledIconButton } from '../../../WorkspaceSettings.styles';

import { constants } from '../../members.constants';

dayjs.extend(localizedFormat);

interface MembersTableRowProps extends TableRowProps {
  member: MemberSchema;
  editMember: (member: MemberSchema) => void;
  removeMember: (member: MemberSchema) => void;
}

const { member, admin, owner } = constants.table.roles;

function getRole(roles: RoleEnum[]) {
  if (roles.includes(RoleEnum.owner)) return owner;
  if (roles.includes(RoleEnum.admin)) return admin;
  return member;
}

export const MembersTableRow = ({
  member,
  editMember,
  removeMember,
  selected,
  ...otherProps
}: MembersTableRowProps) => {
  const { id, full_name, email, created_at, roles } = member;

  const handleMemberActions = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, remove?: boolean) => {
    e.stopPropagation();
    remove ? removeMember(member) : editMember(member);
  };

  return (
    <StyledTableRow key={id} role="checkbox" sx={{ cursor: 'pointer' }} hover {...otherProps}>
      <StyledTableCell padding="checkbox">
        <Checkbox checked={selected} />
      </StyledTableCell>
      <StyledTableCell component="th" scope="row">
        {full_name || 'n/a'}
      </StyledTableCell>
      <StyledTableCell>{email}</StyledTableCell>
      <StyledTableCell>{dayjs(created_at).format('L')}</StyledTableCell>
      <StyledTableCell>{getRole(roles)}</StyledTableCell>
      <StyledTableCell align="right">
        <StyledIconButton onClick={handleMemberActions}>
          <ModeEditIcon />
        </StyledIconButton>
        <StyledIconButton onClick={e => handleMemberActions(e, true)}>
          <DeleteIcon />
        </StyledIconButton>
      </StyledTableCell>
    </StyledTableRow>
  );
};
