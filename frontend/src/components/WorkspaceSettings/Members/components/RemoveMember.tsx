import React from 'react';

import { useRemoveOrganizationMemberApiV1OrganizationMembersMemberIdDelete } from 'api/generated';

import { StyledDeletionDialog } from 'components/lib';

import { events, reportEvent } from 'helpers/services/mixPanel';

import { MembersActionDialogWithInputs } from '../Members.type';
import { constants } from '../members.constants';

const { messageEnd, messageStart, name, submit, title } = constants.removeMember;

export const RemoveMember = ({ member, refetchMembers, open, closeDialog }: MembersActionDialogWithInputs) => {
  const { mutateAsync: deleteMember } = useRemoveOrganizationMemberApiV1OrganizationMembersMemberIdDelete();

  const removeMember = async () => {
    await deleteMember({ memberId: member.id });
    refetchMembers();
    reportEvent(events.authentication.removeUser, {
      'Removed user email': member.email
    });
    closeDialog();
  };

  return (
    <StyledDeletionDialog
      open={open}
      title={title}
      closeDialog={closeDialog}
      submitButtonLabel={submit}
      submitButtonAction={removeMember}
      messageStart={messageStart}
      itemToDelete={name(member.full_name)}
      messageEnd={messageEnd}
    />
  );
};
