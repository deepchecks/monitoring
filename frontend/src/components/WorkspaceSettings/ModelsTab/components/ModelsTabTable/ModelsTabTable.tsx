import React, { useState } from 'react';

import { ModelManagmentSchema } from 'api/generated';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import Paper from '@mui/material/Paper';

import { ModelsTabTableHead } from './ModelsTabTableHead';

import { StyledTableContainer } from '../../../WorkspaceSettings.styles';
import { ModelsTabTableRow } from './ModelsTabTableRow';

import { constants } from '../../modelsTab.constants';
import { EditMembersDialog } from '../EditMembersDialog';
import { useOrganizationMembers } from 'components/WorkspaceSettings/useOrganizationMembers';

interface ModelsTabTableProps {
  models: ModelManagmentSchema[];
}

export const ModelsTabTable = ({ models }: ModelsTabTableProps) => {
  const { organizationMembersList, setOrganizationMembersList, sortedOrganizationMembers } = useOrganizationMembers();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const closeDialog = () => setIsDialogOpen(false);

  const editMembers = (model: ModelManagmentSchema) => {
    setIsDialogOpen(true);
    console.log(model);
  };

  return (
    <>
      <StyledTableContainer sx={{ height: 'calc(100vh - 283px)' }} component={Paper}>
        <Table stickyHeader sx={{ minWidth: 650 }} aria-label={constants.table.ariaLabel}>
          <ModelsTabTableHead />
          <TableBody>
            {models.map(m => (
              <ModelsTabTableRow key={m.id} model={m} editMembers={editMembers} />
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>
      <EditMembersDialog
        initialMembersList={sortedOrganizationMembers}
        membersList={organizationMembersList}
        setMembersList={setOrganizationMembersList}
        open={isDialogOpen}
        closeDialog={closeDialog}
      />
    </>
  );
};
