import React, { useState, useEffect } from 'react';

import { MemberSchema, ModelManagmentSchema, assignUsersToModelApiV1ModelsModelIdMembersPost } from 'api/generated';

import { Stack } from '@mui/material';

import { StyledDialog, StyledInput } from 'components/lib';
import { AssignMembersToModelDialogItem } from './AssignMembersToModelDialogItem';

import { selectMultiple, isSelected } from 'components/WorkspaceSettings/WorkspaceSettings.helpers';
import { useListSearchField } from 'helpers/hooks/useListSearchField';
import { constants } from '../modelsTab.constants';

const { editMembers, dialog } = constants;

interface AssignMembersToModelDialogProps {
  currentModel: ModelManagmentSchema | null;
  initialMembersList: MemberSchema[];
  membersList: MemberSchema[];
  setMembersList: React.Dispatch<React.SetStateAction<MemberSchema[]>>;
  open: boolean;
  closeDialog: () => void;
  refetchModels: () => void;
}

export const AssignMembersToModelDialog = ({
  currentModel,
  initialMembersList,
  membersList,
  setMembersList,
  open,
  closeDialog,
  refetchModels
}: AssignMembersToModelDialogProps) => {
  const { searchFieldValue, handleSearchFieldChange, resetSearchField } = useListSearchField<MemberSchema>(
    initialMembersList,
    setMembersList,
    'full_name'
  );

  const [selectedMembers, setSelectedMembers] = useState<readonly number[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const result: number[] = [];

    if (currentModel) {
      membersList.forEach(({ id }) => {
        if (currentModel.members.includes(id)) result.push(id);
      });
    }

    setSelectedMembers(result);
  }, [currentModel, membersList]);

  const handleAssignMembersToModel = async () => {
    setFetching(true);

    if (currentModel) {
      await assignUsersToModelApiV1ModelsModelIdMembersPost(currentModel.id, {
        user_ids: selectedMembers as number[],
        replace: true
      });
      refetchModels();
    }

    closeDialog();
    setFetching(false);
  };

  return (
    <StyledDialog
      title={editMembers}
      submitButtonLabel={dialog.submitButtonLabel}
      submitButtonAction={handleAssignMembersToModel}
      submitButtonDisabled={fetching}
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
        {membersList.map(m => {
          const id = m.id;
          const isItemSelected = isSelected(id, selectedMembers);

          return (
            <AssignMembersToModelDialogItem
              key={id}
              member={m}
              selected={isItemSelected}
              onClick={e => selectMultiple(e, id, selectedMembers, setSelectedMembers)}
            />
          );
        })}
      </Stack>
    </StyledDialog>
  );
};
