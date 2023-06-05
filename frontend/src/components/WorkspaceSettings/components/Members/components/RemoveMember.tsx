import React from 'react';

import { useRemoveOrganizationMemberApiV1OrganizationMembersMemberIdDelete } from 'api/generated';

import { StyledDeletionDialog } from 'components/lib';

import { MembersActionDialogWithMember } from '../Members.type';
import { constants } from '../members.constants';

const { messageEnd, messageStart, name, submit, title } = constants.removeMember;

export const RemoveMember = ({ member, refetchMembers, open, closeDialog }: MembersActionDialogWithMember) => {
  const { mutateAsync: removeMember } = useRemoveOrganizationMemberApiV1OrganizationMembersMemberIdDelete();

  const handleRemoveMember = async () => {
    await removeMember({ memberId: member.id });
    refetchMembers();
    closeDialog();
  };

  return (
    <StyledDeletionDialog
      open={open}
      title={title}
      closeDialog={closeDialog}
      submitButtonLabel={submit}
      submitButtonAction={handleRemoveMember}
      messageStart={messageStart}
      itemToDelete={name(member.full_name)}
      messageEnd={messageEnd}
    />
  );
};
