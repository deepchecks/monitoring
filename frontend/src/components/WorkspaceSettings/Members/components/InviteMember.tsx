import React, { useState } from 'react';

import { useCreateInviteApiV1OrganizationInvitePut } from 'api/generated';

import { Alert, Snackbar } from '@mui/material';

import ActionDialog from 'components/base/Dialog/ActionDialog/ActionDialog';
import { MembersActionDialogContentLayout } from './MembersActionDialogContentLayout';
import { MembersActionDialogInput } from './MembersActionDialogInput';

import { events, reportEvent } from 'helpers/services/mixPanel';
import { validateEmail } from 'helpers/utils/validateEmail';

import { MembersActionDialog } from '../Members.type';
import { constants } from '../members.constants';

function convertEmailsIntoAnArray(emails: string) {
  return emails
    .split(',')
    .filter(v => v !== '')
    .map(v => v.trim());
}

export const InviteMember = ({ open, closeDialog }: MembersActionDialog) => {
  const [email, setEmail] = useState('');
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { mutateAsync: inviteUser } = useCreateInviteApiV1OrganizationInvitePut();

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setEmail(value);
    const emailsAreValid = convertEmailsIntoAnArray(value).every(e => validateEmail(e));
    setButtonEnabled(emailsAreValid);
  };

  const handleCloseDialog = () => {
    setButtonEnabled(false);
    setError('');
    setEmail('');
    closeDialog();
  };

  const handleInviteMember = async () => {
    inviteUser({ data: { email: convertEmailsIntoAnArray(email) } }).then(() => {
      setSuccess(true);
      reportEvent(events.authentication.inviteUser, {
        'Invited users emails': email
      });
      handleCloseDialog();
    });
  };

  const handleCloseSnackBar = () => setSuccess(false);

  return (
    <>
      <ActionDialog
        open={open}
        title={constants.inviteMember.title}
        closeDialog={handleCloseDialog}
        submitButtonLabel={constants.inviteMember.submit}
        submitButtonDisabled={!buttonEnabled}
        submitButtonAction={handleInviteMember}
      >
        <MembersActionDialogContentLayout>
          <MembersActionDialogInput
            placeholder={constants.inviteMember.placeholder}
            label={constants.inviteMember.inputLabel}
            value={email}
            onChange={handleEmailChange}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </MembersActionDialogContentLayout>
      </ActionDialog>
      <Snackbar
        open={success}
        onClose={handleCloseSnackBar}
        autoHideDuration={6000}
        message={constants.inviteMember.success}
      />
    </>
  );
};
