import React, { useState, useMemo } from 'react';

import { RoleUpdateSchema, updateUserRoleApiV1UsersUserIdRolesPut } from 'api/generated';
import useUser from 'helpers/hooks/useUser';

import { MenuItem } from '@mui/material';

import { MembersActionDialogContentLayout } from './MembersActionDialogContentLayout';
import { MembersActionDialogInput, MembersActionDialogDropdown } from './MembersActionDialogInput';
import { StyledDialog } from 'components/lib';

import { MembersActionDialogWithMember } from '../Members.type';
import { constants } from '../members.constants';

enum RoleEnumWithMember {
  member = 'member',
  admin = 'admin',
  owner = 'owner'
}

const { title, submit, nameInputLabel, emailInputLabel, role } = constants.editMember;
const ROLES = [RoleEnumWithMember.member, RoleEnumWithMember.admin, RoleEnumWithMember.owner];

export const EditMember = ({ member, open, closeDialog, refetchMembers }: MembersActionDialogWithMember) => {
  const { availableFeatures, isOwner } = useUser();

  const currentRole = useMemo(
    () =>
      member.roles.includes(RoleEnumWithMember.owner)
        ? RoleEnumWithMember.owner
        : member.roles.includes(RoleEnumWithMember.admin)
        ? RoleEnumWithMember.admin
        : RoleEnumWithMember.member,
    [member]
  );

  const [name, setName] = useState(member.full_name);
  const [email, setEmail] = useState(member.email);
  const [selectValue, setSelectValue] = useState<RoleEnumWithMember>(currentRole);
  const [fetching, setFetching] = useState(false);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handleEditMember = async () => {
    if (selectValue !== currentRole) {
      setFetching(true);

      const body: RoleUpdateSchema = {
        roles:
          selectValue === RoleEnumWithMember.owner
            ? [RoleEnumWithMember.admin, RoleEnumWithMember.owner]
            : selectValue === RoleEnumWithMember.admin
            ? [RoleEnumWithMember.admin]
            : [],
        replace: true
      };

      await updateUserRoleApiV1UsersUserIdRolesPut(member.id, body);
      refetchMembers();
      setFetching(false);
    }

    closeDialog();
  };

  return (
    <StyledDialog
      open={open}
      title={title}
      closeDialog={closeDialog}
      submitButtonLabel={submit}
      submitButtonAction={handleEditMember}
      submitButtonDisabled={fetching}
    >
      <MembersActionDialogContentLayout>
        <MembersActionDialogInput label={nameInputLabel} value={name} onChange={handleNameChange} />
        <MembersActionDialogInput label={emailInputLabel} value={email} onChange={handleEmailChange} />
        {isOwner && availableFeatures?.update_roles && (
          <MembersActionDialogDropdown
            label={role}
            value={selectValue}
            onChange={e => setSelectValue(e.target.value as RoleEnumWithMember)}
          >
            {ROLES.map((val, i) => (
              <MenuItem key={i} value={val}>
                {val}
              </MenuItem>
            ))}
          </MembersActionDialogDropdown>
        )}
      </MembersActionDialogContentLayout>
    </StyledDialog>
  );
};
