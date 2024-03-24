import React, { useState, useEffect } from 'react';

import { StyledDialog, StyledHighlightedText, StyledInput } from 'components/lib';
import { DialogListItem } from 'components/WorkspaceSettings/components/DialogListItem';

import { StyledDialogListContainer } from 'components/WorkspaceSettings/WorkspaceSettings.styles';

import useModels from 'helpers/hooks/useModels';
import { useListSearchField } from 'helpers/hooks/useListSearchField';
import { selectMultiple, isSelected } from 'components/WorkspaceSettings/WorkspaceSettings.helpers';
import {
  DeepchecksMonitoringEeApiV1MembersIdNotifySchema,
  MemberSchema,
  ModelManagmentSchema,
  assignModelsToUserApiV1UsersUserIdModelsPost
} from 'api/generated';

import { constants } from '../members.constants';
import { MembersActionDialog } from '../Members.type';

interface AssignModelsProps extends MembersActionDialog {
  member: MemberSchema | null;
}

const { title, dialogListItemSubtitle, searchfieldPlaceholder, submitButtonLabel, willBeAssignedTo } =
  constants.assignModels;

export const AssignModels = ({ open, closeDialog, member }: AssignModelsProps) => {
  const { models: initialModels, refetchModels } = useModels('showAll');

  const [fetching, setFetching] = useState(false);
  const [modelsList, setModelsList] = useState<ModelManagmentSchema[]>([]);
  const [selectedModels, setSelectedModels] = useState<readonly number[]>([]);
  const [modelsAndNotifications, setModelsAndNotifications] = useState<
    DeepchecksMonitoringEeApiV1MembersIdNotifySchema[]
  >([]);

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
        const memberIds = members.map(m => m.id);

        if (memberIds.includes(member.id)) result.push(id);
      });
    }

    setSelectedModels(result);
  }, [member, modelsList]);

  const handleAssignModelsToMember = async () => {
    setFetching(true);

    if (member) {
      await assignModelsToUserApiV1UsersUserIdModelsPost(member.id, {
        models: modelsAndNotifications,
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

          const isNotified = modelsAndNotifications?.filter(m => m.id === id)[0]?.notify;

          const handleChangeNotify = () => {
            const updatedList = modelsAndNotifications.map(model =>
              model.id === id ? { ...model, notify: !isNotified } : model
            );

            setModelsAndNotifications(updatedList);
          };

          return (
            <DialogListItem
              key={id}
              title={m.name}
              isNotified={isNotified}
              selected={isItemSelected}
              handleChangeNotify={handleChangeNotify}
              subtitle={dialogListItemSubtitle(m.latest_time)}
              onClick={e => selectMultiple(e, id, selectedModels, setSelectedModels)}
            />
          );
        })}
      </StyledDialogListContainer>
    </StyledDialog>
  );
};
