import React from 'react';

import { MemberSchema } from 'api/generated';

import { StyledDeletionDialog } from 'components/lib';

import { constants } from '../members.constants';
import { MembersActionDialogWithRefetch } from '../Members.type';

const { messageEnd, messageStart, submit, title } = constants.removeSelectedMembers;

interface RemoveSelectedMembersProps extends MembersActionDialogWithRefetch {
  members: MemberSchema[];
  selectedMembers: readonly number[];
}

function buildMembersToRemoveString(members: MemberSchema[], selectedMembers: readonly number[]) {
  return selectedMembers.length === members.length
    ? 'all members'
    : members
        .filter(m => selectedMembers.includes(m.id))
        .map(m => m.full_name)
        .join(', ');
}

export const RemoveSelectedMembers = ({
  members,
  open,
  closeDialog,
  selectedMembers,
  refetchMembers
}: RemoveSelectedMembersProps) => {
  return (
    <StyledDeletionDialog
      open={open}
      title={title}
      closeDialog={closeDialog}
      submitButtonLabel={submit}
      submitButtonAction={closeDialog}
      messageStart={messageStart}
      itemToDelete={buildMembersToRemoveString(members, selectedMembers)}
      messageEnd={messageEnd}
    />
  );
};
