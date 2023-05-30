import React from 'react';

import { MemberSchema } from 'api/generated';

import { InviteMember } from './InviteMember';
import { EditMember } from './EditMember';
import { RemoveMember } from './RemoveMember';
import { RemoveSelectedMembers } from './RemoveSelectedMembers';
import { DeleteWorkspaceDialog } from './DeleteWorkspaceDialog';

import { MembersActionDialog, MembersActionDialogOptions } from '../Members.type';
import { AssignModels } from './AssignModels';

interface MembersListActionDialogProps extends MembersActionDialog {
  members: MemberSchema[];
  selectedMembers: readonly number[];
  setSelectedMembers: React.Dispatch<React.SetStateAction<readonly number[]>>;
  currentMember: MemberSchema | null;
  action: MembersActionDialogOptions;
  refetchMembers: () => void;
}

export const MembersListActionDialog = ({
  members,
  selectedMembers,
  setSelectedMembers,
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
      return (
        <RemoveSelectedMembers
          members={members}
          selectedMembers={selectedMembers}
          setSelectedMembers={setSelectedMembers}
          {...sharedProps}
        />
      );

    case MembersActionDialogOptions.assignModels:
      return <AssignModels member={currentMember} {...sharedProps} />;

    case MembersActionDialogOptions.deleteWorkspace:
      return <DeleteWorkspaceDialog {...sharedProps} />;

    default:
      return <></>;
  }
};
