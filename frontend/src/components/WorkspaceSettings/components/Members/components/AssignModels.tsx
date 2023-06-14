import React, { useState, useEffect } from 'react';

import { MemberSchema, ModelManagmentSchema, assignModelsToUserApiV1UsersUserIdModelsPost } from 'api/generated';
import { useListSearchField } from 'helpers/hooks/useListSearchField';
import useModels from 'helpers/hooks/useModels';

import { StyledDialog, StyledHighlightedText, StyledInput } from 'components/lib';
import { DialogListItem } from 'components/WorkspaceSettings/components/DialogListItem';

import { StyledDialogListContainer } from 'components/WorkspaceSettings/WorkspaceSettings.styles';
import { selectMultiple, isSelected } from 'components/WorkspaceSettings/WorkspaceSettings.helpers';
import { MembersActionDialog } from '../Members.type';
import { constants } from '../members.constants';

interface AssignModelsProps extends MembersActionDialog {
  member: MemberSchema | null;
}

const { title, dialogListItemSubtitle, searchfieldPlaceholder, submitButtonLabel, willBeAssignedTo } =
  constants.assignModels;

export const AssignModels = ({ open, closeDialog, member }: AssignModelsProps) => {
  const { models: initialModels, refetchModels } = useModels('showAll');

  const [modelsList, setModelsList] = useState<ModelManagmentSchema[]>([]);
  const [selectedModels, setSelectedModels] = useState<readonly number[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    initialModels.length && setModelsList(initialModels);
  }, [initialModels]);

  const { searchFieldValue, handleSearchFieldChange, resetSearchField } = useListSearchField<ModelManagmentSchema>(
    initialModels,
    setModelsList,
    'name'
  );

  useEffect(() => {
    const result: number[] = [];

    if (member) {
      modelsList.forEach(({ id, members }) => {
        if (members.includes(member.id)) result.push(id);
      });
    }

    setSelectedModels(result);
  }, [member, modelsList]);

  const handleAssignModelsToMember = async () => {
    setFetching(true);

    if (member) {
      await assignModelsToUserApiV1UsersUserIdModelsPost(member.id, {
        model_ids: selectedModels as number[],
        replace: true
      });
      refetchModels();
    }

    closeDialog();
    setFetching(false);
  };

  return (
    <StyledDialog
      title={title}
      submitButtonLabel={submitButtonLabel}
      submitButtonAction={handleAssignModelsToMember}
      submitButtonDisabled={fetching}
      open={open}
      closeDialog={closeDialog}
    >
      {member?.full_name && (
        <StyledHighlightedText
          beforeHighlightedText={willBeAssignedTo}
          highlightedText={member.full_name}
          highlightedTextType="bodyBold"
          margin="-15px 0 0 4px"
        />
      )}
      <StyledInput
        placeholder={searchfieldPlaceholder}
        value={searchFieldValue}
        onChange={handleSearchFieldChange}
        onCloseIconClick={resetSearchField}
        searchField
        fullWidth
        sx={{ marginBottom: '5px' }}
      />
      <StyledDialogListContainer>
        {modelsList.map(m => {
          const id = m.id;
          const isItemSelected = isSelected(id, selectedModels);

          return (
            <DialogListItem
              key={id}
              onClick={e => selectMultiple(e, id, selectedModels, setSelectedModels)}
              selected={isItemSelected}
              title={m.name}
              subtitle={dialogListItemSubtitle(m.latest_time)}
            />
          );
        })}
      </StyledDialogListContainer>
    </StyledDialog>
  );
};
