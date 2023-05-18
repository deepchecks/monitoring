import React, { useState } from 'react';

import { MemberSchema, useRemoveOrganizationMemberApiV1OrganizationMembersMemberIdDelete } from 'api/generated';

import { StyledDeletionDialog } from 'components/lib';

import { events, reportEvent } from 'helpers/services/mixPanel';
import { MembersActionDialogWithRefetch } from '../Members.type';
import { constants } from '../members.constants';

interface RemoveSelectedMembersProps extends MembersActionDialogWithRefetch {
  members: MemberSchema[];
  selectedMembers: readonly number[];
  setSelectedMembers: React.Dispatch<React.SetStateAction<readonly number[]>>;
}

const { messageEnd, messageStart, submit, title, allMembers } = constants.removeSelectedMembers;

function buildMembersToRemoveString(members: MemberSchema[], selectedMembers: readonly number[]) {
  return selectedMembers.length === members.length
    ? allMembers
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
  setSelectedMembers,
  refetchMembers
}: RemoveSelectedMembersProps) => {
  const { mutateAsync: removeMember } = useRemoveOrganizationMemberApiV1OrganizationMembersMemberIdDelete();

  const [fetching, setFetching] = useState(false);

  const handleRemoveMember = async (memberId: number) => {
    await removeMember({ memberId: memberId });
    reportEvent(events.authentication.removeUser, {
      'Removed user email': members.find(m => m.id === memberId)?.email || ''
    });
  };

  const handleRemoveSelectedMembers = () => {
    setFetching(true);
    Promise.all(selectedMembers.map(memberId => handleRemoveMember(memberId))).then(() => {
      refetchMembers();
      closeDialog();
      setSelectedMembers([]);
      setFetching(false);
    });
  };

  return (
    <StyledDeletionDialog
      open={open}
      title={title}
      closeDialog={closeDialog}
      submitButtonLabel={submit}
      submitButtonAction={handleRemoveSelectedMembers}
      submitButtonDisabled={fetching}
      messageStart={messageStart}
      itemToDelete={buildMembersToRemoveString(members, selectedMembers)}
      messageEnd={messageEnd}
    />
  );
};
