import React from 'react';

import { useRemoveOrganizationMemberApiV1OrganizationMembersMemberIdDelete } from 'api/generated';

import { Typography } from '@mui/material';

import ActionDialog from 'components/base/Dialog/ActionDialog/ActionDialog';
import { MembersActionDialogContentLayout } from './MembersActionDialogContentLayout';

import { events, reportEvent } from 'helpers/services/mixPanel';

import { MembersActionDialogWithInputs } from '../Members.type';
import { constants } from '../members.constants';

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
    <ActionDialog
      open={open}
      title={constants.removeMember.title}
      closeDialog={closeDialog}
      submitButtonLabel={constants.removeMember.submit}
      submitButtonAction={removeMember}
      submitButtonAlertType
    >
      <MembersActionDialogContentLayout>
        <Typography fontSize="16px" textAlign="left">
          {constants.removeMember.messageStart}
          <Typography component="span" fontWeight={600}>
            {constants.removeMember.name(member.full_name)}
          </Typography>
          {constants.removeMember.messageEnd}
        </Typography>
      </MembersActionDialogContentLayout>
    </ActionDialog>
  );
};
