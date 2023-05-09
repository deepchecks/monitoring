import React, { useEffect, useState } from 'react';

import { useCreateInviteApiV1OrganizationInvitePut } from 'api/generated';

import { Snackbar, Typography } from '@mui/material';

import { Dialog as StyledDialog } from 'components/lib/components/Dialog/Dialog';
import { MembersActionDialogContentLayout } from './MembersActionDialogContentLayout';
import { MembersActionDialogInput } from './MembersActionDialogInput';

import { events, reportEvent } from 'helpers/services/mixPanel';
import { validateEmail } from 'helpers/utils/validateEmail';
import { resError } from 'helpers/types/resError';

import { MembersActionDialog } from '../Members.type';
import { constants } from '../members.constants';

import { theme } from 'components/lib/theme';

function convertEmailsIntoAnArray(emails: string) {
  return emails
    .split(',')
    .filter(v => v !== '')
    .map(v => v.trim());
}

export const InviteMember = ({ open, closeDialog }: MembersActionDialog) => {
  const [err, setErr] = useState('');
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);

  const { mutateAsync: inviteUser } = useCreateInviteApiV1OrganizationInvitePut();

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setEmail(value);
    const emailsAreValid = convertEmailsIntoAnArray(value).every(e => validateEmail(e));
    setButtonEnabled(emailsAreValid);
  };

  const handleCloseDialog = () => {
    setButtonEnabled(false);
    setErr('');
    setEmail('');
    closeDialog();
  };

  const handleInviteMember = async () => {
    const res = await inviteUser({ data: { email: convertEmailsIntoAnArray(email) } });
    setErr((res as resError)?.error_message ?? 'none');
  };

  useEffect(() => {
    if (err === 'none') {
      setSuccess(true);
      reportEvent(events.authentication.inviteUser, {
        'Invited users emails': email
      });
      handleCloseDialog();
    }
  }, [err]);

  const handleCloseSnackBar = () => setSuccess(false);

  return (
    <>
      <StyledDialog
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
          <Typography sx={{ margin: '8px', color: theme.palette.error.main }}>{err !== 'none' && err}</Typography>
        </MembersActionDialogContentLayout>
      </StyledDialog>
      <Snackbar
        open={success}
        onClose={handleCloseSnackBar}
        autoHideDuration={6000}
        message={constants.inviteMember.success}
      />
    </>
  );
};
