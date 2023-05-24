import React from 'react';

import { MemberSchema } from 'api/generated';

import { Stack } from '@mui/material';

import { StyledDialog, StyledInput } from 'components/lib';
import { EditMembersDialogItem } from './EditMembersDialogItem';

import { useListSearchField } from 'helpers/hooks/useListSearchField';
import { constants } from '../modelsTab.constants';

const { editMembers, dialog } = constants;

interface EditMembersDialogProps {
  initialMembersList: MemberSchema[];
  membersList: MemberSchema[];
  setMembersList: React.Dispatch<React.SetStateAction<MemberSchema[]>>;
  open: boolean;
  closeDialog: () => void;
}

export const EditMembersDialog = ({
  initialMembersList,
  membersList,
  setMembersList,
  open,
  closeDialog
}: EditMembersDialogProps) => {
  const { searchFieldValue, handleSearchFieldChange, resetSearchField } = useListSearchField<MemberSchema>(
    initialMembersList,
    setMembersList,
    'full_name'
  );

  return (
    <StyledDialog
      title={editMembers}
      submitButtonLabel={dialog.submitButtonLabel}
      submitButtonAction={closeDialog}
      open={open}
      closeDialog={closeDialog}
    >
      <StyledInput
        placeholder={dialog.inputPlaceholder}
        value={searchFieldValue}
        onChange={handleSearchFieldChange}
        onCloseIconClick={resetSearchField}
        searchField
        fullWidth
        sx={{ marginBottom: '5px' }}
      />
      <Stack height="460px" overflow="auto">
        {membersList.map(m => (
          <EditMembersDialogItem key={m.id} member={m} />
        ))}
      </Stack>
    </StyledDialog>
  );
};
