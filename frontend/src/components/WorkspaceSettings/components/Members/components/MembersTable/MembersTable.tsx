import React from 'react';

import { MemberSchema } from 'api/generated';
import useModels from 'helpers/hooks/useModels';
import useUser from 'helpers/hooks/useUser';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import Paper from '@mui/material/Paper';

import { MembersTableHead } from './MembersTableHead';
import { MembersTableRow } from './MembersTableRow';

import { StyledTableContainer } from '../../../../WorkspaceSettings.styles';

import { selectMultiple, isSelected } from 'components/WorkspaceSettings/WorkspaceSettings.helpers';
import { MembersActionDialogOptions } from '../../Members.type';
import { constants } from '../../members.constants';

interface MembersTableProps {
  members: MemberSchema[];
  selected: readonly number[];
  setSelected: React.Dispatch<React.SetStateAction<readonly number[]>>;
  handleOpenActionDialog: (action: MembersActionDialogOptions, member?: MemberSchema | null) => void;
}

export const MembersTable = ({ members, selected, setSelected, handleOpenActionDialog }: MembersTableProps) => {
  const { models } = useModels('showAll');
  const { availableFeatures } = useUser();
  const modelAssignment = availableFeatures?.model_assignment;

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = members.map(m => m.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const editMember = (member: MemberSchema) => handleOpenActionDialog(MembersActionDialogOptions.edit, member);

  const removeMember = (member: MemberSchema) => handleOpenActionDialog(MembersActionDialogOptions.remove, member);

  const assignModels = (member: MemberSchema) =>
    handleOpenActionDialog(MembersActionDialogOptions.assignModels, member);

  return (
    <StyledTableContainer component={Paper} sx={{ height: 'calc(100vh - 356px)' }}>
      <Table stickyHeader sx={{ minWidth: 650 }} aria-label={constants.table.ariaLabel}>
        <MembersTableHead
          numSelected={selected.length}
          rowCount={members.length}
          selectAllClick={handleSelectAllClick}
          onClick={() => handleSelectAllClick}
          modelAssignment={modelAssignment}
        />
        <TableBody>
          {members.map(member => {
            const id = member.id;
            const isItemSelected = isSelected(id, selected);

            return (
              <MembersTableRow
                key={id}
                aria-checked={isItemSelected}
                tabIndex={-1}
                member={member}
                editMember={editMember}
                removeMember={removeMember}
                assignModels={assignModels}
                selected={isItemSelected}
                onClick={e => selectMultiple(e, id, selected, setSelected)}
                models={models}
                modelAssignment={modelAssignment}
              />
            );
          })}
        </TableBody>
      </Table>
    </StyledTableContainer>
  );
};
