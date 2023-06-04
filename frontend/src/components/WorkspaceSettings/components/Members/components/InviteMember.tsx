import React, { useEffect, useState } from 'react';

import { useCreateInviteApiV1OrganizationInvitePut } from 'api/generated';

import { Snackbar } from '@mui/material';

import { StyledDialog, StyledText } from 'components/lib';
import { MembersActionDialogContentLayout } from './MembersActionDialogContentLayout';
import { MembersActionDialogInput } from './MembersActionDialogInput';

import { validateEmail } from 'helpers/utils/validateEmail';
import { resError } from 'helpers/types/resError';
import { featuresList, usePermissionControl } from 'helpers/base/permissionControl';
import { events, reportEvent } from 'helpers/services/mixPanel';

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
  const isEmailEnabled = !usePermissionControl({ feature: featuresList.email_enabled });

  const mailErrMessage = !isEmailEnabled && constants.inviteMember.mailConfigErr;
  const resErrMessage = err !== 'none' && err;
  const btnAndTitleLabel = isEmailEnabled ? constants.inviteMember.submit : constants.inviteMember.add;

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
      reportEvent(events.workspaceSettings.invite, { invitees: email });
      handleCloseDialog();
    }
  }, [err]);

  const handleCloseSnackBar = () => setSuccess(false);

  return (
    <>
      <StyledDialog
        open={open}
        title={btnAndTitleLabel}
        closeDialog={handleCloseDialog}
        submitButtonLabel={btnAndTitleLabel}
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
          <StyledText text={resErrMessage} color={theme.palette.error.main} marginBottom="8px" />
          <StyledText text={mailErrMessage} type="bodyBold" />
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
