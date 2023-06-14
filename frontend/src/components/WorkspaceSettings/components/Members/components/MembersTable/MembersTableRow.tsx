import React from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { MemberSchema, ModelManagmentSchema, RoleEnum } from 'api/generated';

import { Checkbox, TableRowProps } from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import ModeEditIcon from '@mui/icons-material/ModeEdit';

import {
  StyledTableRow,
  StyledTableCell,
  StyledIconButton,
  StyledTableCellBold,
  StyledTableCellButton
} from '../../../../WorkspaceSettings.styles';

import { constants } from '../../members.constants';

dayjs.extend(localizedFormat);

interface MembersTableRowProps extends TableRowProps {
  member: MemberSchema;
  editMember: (member: MemberSchema) => void;
  removeMember: (member: MemberSchema) => void;
  assignModels: (member: MemberSchema) => void;
  models: ModelManagmentSchema[];
  modelAssignment: boolean | undefined;
}

const { roles, allModels, assignModels } = constants.table;
const { member, admin, owner } = roles;

function getRole(roles: RoleEnum[]) {
  if (roles.includes(RoleEnum.owner)) return owner;
  if (roles.includes(RoleEnum.admin)) return admin;
  return member;
}

function calculateButtonLabel(memberId: number, models: ModelManagmentSchema[]) {
  let count = 0;

  models.forEach(m => {
    if (m.members.includes(memberId)) count++;
  });

  if (count === models.length) return allModels;

  if (count === 0) return assignModels;

  return `${count} model${count === 1 ? '' : 's'}`;
}

export const MembersTableRow = ({
  member,
  editMember,
  removeMember,
  selected,
  assignModels,
  models,
  modelAssignment,
  ...otherProps
}: MembersTableRowProps) => {
  const { id, full_name, email, created_at, roles } = member;

  const handleMemberActions = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, action?: 'assign' | 'remove') => {
    e.stopPropagation();
    action === 'assign' ? assignModels(member) : action === 'remove' ? removeMember(member) : editMember(member);
  };

  return (
    <StyledTableRow key={id} role="checkbox" sx={{ cursor: 'pointer' }} hover {...otherProps}>
      <StyledTableCell padding="checkbox">
        <Checkbox checked={selected} />
      </StyledTableCell>
      <StyledTableCellBold component="th" scope="row">
        {full_name || 'n/a'}
      </StyledTableCellBold>
      <StyledTableCell>{email}</StyledTableCell>
      <StyledTableCell>{dayjs(created_at).format('L')}</StyledTableCell>
      <StyledTableCell>{getRole(roles)}</StyledTableCell>
      {modelAssignment && (
        <StyledTableCell align="center">
          <StyledTableCellButton
            label={calculateButtonLabel(member.id, models)}
            variant="text"
            onClick={e => handleMemberActions(e, 'assign')}
          />
        </StyledTableCell>
      )}
      <StyledTableCell align="right">
        <StyledIconButton onClick={handleMemberActions}>
          <ModeEditIcon />
        </StyledIconButton>
        <StyledIconButton onClick={e => handleMemberActions(e, 'remove')}>
          <DeleteIcon />
        </StyledIconButton>
      </StyledTableCell>
    </StyledTableRow>
  );
};
