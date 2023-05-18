import React from 'react';

import { MemberSchema } from 'api/generated';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import Paper from '@mui/material/Paper';

import { MembersTableHead } from './MembersTableHead';
import { MembersTableRow } from './MembersTableRow';

import { StyledTableContainer } from './MembersTable.style';

import { MembersActionDialogOptions } from '../../Members.type';
import { constants } from '../../members.constants';

interface MembersTableProps {
  members: MemberSchema[];
  selected: readonly number[];
  setSelected: React.Dispatch<React.SetStateAction<readonly number[]>>;
  handleOpenActionDialog: (action: MembersActionDialogOptions, member?: MemberSchema | null) => void;
}

export const MembersTable = ({ members, selected, setSelected, handleOpenActionDialog }: MembersTableProps) => {
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = members.map(m => m.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleSelect = (event: React.MouseEvent<unknown>, id: number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    }

    setSelected(newSelected);
  };

  const isSelected = (id: number) => selected.indexOf(id) !== -1;

  const editMember = (member: MemberSchema) => handleOpenActionDialog(MembersActionDialogOptions.edit, member);

  const removeMember = (member: MemberSchema) => handleOpenActionDialog(MembersActionDialogOptions.remove, member);

  return (
    <StyledTableContainer component={Paper}>
      <Table stickyHeader sx={{ minWidth: 650 }} aria-label={constants.table.ariaLabel}>
        <MembersTableHead
          numSelected={selected.length}
          rowCount={members.length}
          selectAllClick={handleSelectAllClick}
          onClick={() => handleSelectAllClick}
        />
        <TableBody>
          {members.map(member => {
            const id = member.id;
            const isItemSelected = isSelected(id);

            return (
              <MembersTableRow
                key={id}
                aria-checked={isItemSelected}
                tabIndex={-1}
                member={member}
                editMember={editMember}
                removeMember={removeMember}
                selected={isItemSelected}
                onClick={event => handleSelect(event, id)}
              />
            );
          })}
        </TableBody>
      </Table>
    </StyledTableContainer>
  );
};
