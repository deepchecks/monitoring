import React, { useEffect, useState } from 'react';

import { useCreateInviteApiV1OrganizationInvitePut } from 'api/generated';

import { Snackbar } from '@mui/material';

import { StyledContainer, StyledDialog, StyledText } from 'components/lib';
import { MembersActionDialogContentLayout } from './MembersActionDialogContentLayout';
import { BaseInput } from 'components/base/InputDropdown/InputDropdown';

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

  const resErrMessage = err !== 'none' && err;
  const submitBtnLabel = isEmailEnabled ? constants.inviteMember.submit : constants.inviteMember.copy;

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
    if (isEmailEnabled) {
      const res = await inviteUser({ data: { email: convertEmailsIntoAnArray(email) } });
      setErr((res as resError)?.error_message ?? 'none');
    } else {
      navigator.clipboard.writeText(window.location.href);
      handleCloseDialog();
    }
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
        submitButtonDisabled={!buttonEnabled && isEmailEnabled}
        submitButtonAction={handleInviteMember}
      >
        <MembersActionDialogContentLayout>
          {isEmailEnabled ? (
            <BaseInput
              placeholder={constants.inviteMember.placeholder}
              label={constants.inviteMember.inputLabel}
              value={email}
              onChange={handleEmailChange}
            />
          ) : (
            <>
              <StyledContainer flexDirection="row" padding="0">
                <StyledText text={constants.inviteMember.mailConfigErr.first} type="h3" />
                <a
                  href={constants.inviteMember.mailConfigErr.docLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '16px' }}
                >
                  {constants.inviteMember.mailConfigErr.second}
                </a>
              </StyledContainer>

              <StyledText text={constants.inviteMember.mailConfigErr.third} type="h3" />
            </>
          )}
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
