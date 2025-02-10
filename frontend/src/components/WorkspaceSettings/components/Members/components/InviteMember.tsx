import React, { useEffect, useState } from 'react';

import { useCreateInviteApiV1OrganizationInvitePut } from 'api/generated';

import { Snackbar } from '@mui/material';

import { StyledDialog, StyledText } from 'components/lib';
import { MembersActionDialogContentLayout } from './MembersActionDialogContentLayout';
import { BaseInput } from 'components/base/InputDropdown/InputDropdown';

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

  const resErrMessage = err !== 'none' && err;
  const submitBtnLabel = constants.inviteMember.submit

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
      handleCloseDialog();
    }
  }, [err]);

  const handleCloseSnackBar = () => setSuccess(false);

  return (
    <>
      <StyledDialog
        open={open}
        title={constants.inviteMember.submit}
        closeDialog={handleCloseDialog}
        submitButtonLabel={submitBtnLabel}
        submitButtonDisabled={!buttonEnabled}
        submitButtonAction={handleInviteMember}
      >
        <MembersActionDialogContentLayout>
          <BaseInput
            placeholder={constants.inviteMember.placeholder}
            label={constants.inviteMember.inputLabel}
            value={email}
            onChange={handleEmailChange}
          />
          <StyledText text={resErrMessage} color={theme.palette.error.main} marginBottom="8px" />
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
