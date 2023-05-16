import React from 'react';

import { MemberSchema } from 'api/generated';

import { InviteMember } from './InviteMember';
import { EditMember } from './EditMember';
import { RemoveMember } from './RemoveMember';
import { RemoveSelectedMembers } from './RemoveSelectedMembers';
import { DeleteWorkspaceDialog } from './DeleteWorkspaceDialog';

import { MembersActionDialog, MembersActionDialogOptions } from '../Members.type';

interface MembersListActionDialogProps extends MembersActionDialog {
  members: MemberSchema[];
  selectedMembers: readonly number[];
  currentMember: MemberSchema | null;
  action: MembersActionDialogOptions;
  refetchMembers: () => void;
}

export const MembersListActionDialog = ({
  members,
  selectedMembers,
  currentMember,
  action,
  open,
  closeDialog,
  refetchMembers
}: MembersListActionDialogProps) => {
  const sharedProps = {
    open,
    closeDialog,
    refetchMembers
  };

  switch (action) {
    case MembersActionDialogOptions.invite:
      return <InviteMember open={open} closeDialog={closeDialog} />;

    case MembersActionDialogOptions.edit:
      return currentMember && <EditMember member={currentMember} {...sharedProps} />;

    case MembersActionDialogOptions.remove:
      return currentMember && <RemoveMember member={currentMember} {...sharedProps} />;

    case MembersActionDialogOptions.removeSelected:
      return <RemoveSelectedMembers members={members} selectedMembers={selectedMembers} {...sharedProps} />;

    case MembersActionDialogOptions.assignModel:
      return <></>;

    case MembersActionDialogOptions.deleteWorkspace:
      return <DeleteWorkspaceDialog {...sharedProps} />;

    default:
      return <></>;
  }
};
