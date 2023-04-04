import React from 'react';

import { MemberSchema } from 'api/generated';

import { InviteMember } from './InviteMember';
import { EditMember } from './EditMember';
import { RemoveMember } from './RemoveMember';

import { MembersActionDialog, MembersActionDialogOptions } from '../Members.type';

interface MembersListActionDialogProps extends MembersActionDialog {
  member: MemberSchema | null;
  action: MembersActionDialogOptions;
  refetchMembers: () => void;
}

export const MembersListActionDialog = ({
  member,
  action,
  open,
  closeDialog,
  refetchMembers
}: MembersListActionDialogProps) => {
  switch (action) {
    case MembersActionDialogOptions.invite:
      return <InviteMember open={open} closeDialog={closeDialog} />;

    case MembersActionDialogOptions.edit:
      return (
        member && <EditMember member={member} open={open} closeDialog={closeDialog} refetchMembers={refetchMembers} />
      );

    case MembersActionDialogOptions.remove:
      return (
        member && <RemoveMember member={member} open={open} closeDialog={closeDialog} refetchMembers={refetchMembers} />
      );

    default:
      return <></>;
  }
};
