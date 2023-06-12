import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { RoleUpdateSchema, updateUserRoleApiV1UsersUserIdRolesPut } from 'api/generated';
import useUser from 'helpers/hooks/useUser';

import { MenuItem } from '@mui/material';

import { MembersActionDialogContentLayout } from './MembersActionDialogContentLayout';
import { StyledDialog } from 'components/lib';
import { BaseInput, BaseDropdown } from 'components/base/InputDropdown/InputDropdown';

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
  const { availableFeatures, isOwner, user, refetchUser } = useUser();
  const navigate = useNavigate();

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

      if (member.id === user?.id && body.roles.length === 0) {
        refetchUser();
        navigate('/dashboard', { replace: true });
      }
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
        <BaseInput inputLabel={nameInputLabel} value={name} onChange={handleNameChange} disabled />
        <BaseInput inputLabel={emailInputLabel} value={email} onChange={handleEmailChange} disabled />
        {isOwner && availableFeatures?.update_roles && (
          <BaseDropdown
            inputLabel={role}
            value={selectValue}
            onChange={e => setSelectValue(e.target.value as RoleEnumWithMember)}
          >
            {ROLES.map((val, i) => (
              <MenuItem key={i} value={val}>
                {val}
              </MenuItem>
            ))}
          </BaseDropdown>
        )}
      </MembersActionDialogContentLayout>
    </StyledDialog>
  );
};
