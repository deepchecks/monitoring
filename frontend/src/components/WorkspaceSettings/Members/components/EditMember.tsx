import React, { useState } from 'react';

import { MembersActionDialogContentLayout } from './MembersActionDialogContentLayout';
import { MembersActionDialogInput } from './MembersActionDialogInput';
import { StyledDialog } from 'components/lib';

import { MembersActionDialogWithInputs } from '../Members.type';
import { constants } from '../members.constants';

export const EditMember = ({ member, open, closeDialog }: MembersActionDialogWithInputs) => {
  const [name, setName] = useState(member.full_name);
  const [email, setEmail] = useState(member.email);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  return (
    <StyledDialog
      open={open}
      title={constants.editMember.title}
      closeDialog={closeDialog}
      submitButtonLabel={constants.editMember.submit}
      submitButtonAction={closeDialog}
    >
      <MembersActionDialogContentLayout>
        <MembersActionDialogInput
          label={constants.editMember.nameInputLabel}
          value={name}
          onChange={handleNameChange}
          sx={{ marginBottom: '20px' }}
        />
        <MembersActionDialogInput
          label={constants.editMember.emailInputLabel}
          value={email}
          onChange={handleEmailChange}
        />
      </MembersActionDialogContentLayout>
    </StyledDialog>
  );
};
