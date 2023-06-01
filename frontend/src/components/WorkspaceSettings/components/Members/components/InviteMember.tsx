import React, { useEffect, useState } from 'react';

import { useCreateInviteApiV1OrganizationInvitePut } from 'api/generated';

import { Snackbar, Typography } from '@mui/material';

import { StyledDialog } from 'components/lib';
import { MembersActionDialogContentLayout } from './MembersActionDialogContentLayout';
import { MembersActionDialogInput } from './MembersActionDialogInput';

import { events, reportEvent } from 'helpers/services/mixPanel';
import { validateEmail } from 'helpers/utils/validateEmail';
import { resError } from 'helpers/types/resError';
import { featuresList, usePermissionControl } from 'helpers/base/permissionControl';

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
  const isEmailEnabled = usePermissionControl({ feature: featuresList.email_enabled });

  const errMessage = !isEmailEnabled
    ? "Invitee won't get email since email is not configured. Go to to docs for guide how to configure it"
    : err !== 'none' && err;

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
        submitButtonDisabled={!buttonEnabled || !isEmailEnabled}
        submitButtonAction={handleInviteMember}
      >
        <MembersActionDialogContentLayout>
          <MembersActionDialogInput
            placeholder={constants.inviteMember.placeholder}
            label={constants.inviteMember.inputLabel}
            value={email}
            onChange={handleEmailChange}
            disabled={!isEmailEnabled}
          />
          <Typography sx={{ margin: '8px', color: theme.palette.error.main }}>{errMessage}</Typography>
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
