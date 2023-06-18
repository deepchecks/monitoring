import React, { useState } from 'react';

import { ModelManagmentSchema } from 'api/generated';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import Paper from '@mui/material/Paper';

import { ModelsTabTableHead } from './ModelsTabTableHead';

import { StyledTableContainer } from '../../../../WorkspaceSettings.styles';
import { ModelsTabTableRow } from './ModelsTabTableRow';

import { constants } from '../../modelsTab.constants';
import { AssignMembersToModelDialog } from '../AssignMembersToModelDialog';
import { useOrganizationMembers } from 'components/WorkspaceSettings/useOrganizationMembers';

interface ModelsTabTableProps {
  models: ModelManagmentSchema[];
  refetchModels: () => void;
}

export const ModelsTabTable = ({ models, refetchModels }: ModelsTabTableProps) => {
  const { organizationMembersList, setOrganizationMembersList } = useOrganizationMembers();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelManagmentSchema | null>(null);

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => setCurrentModel(null), 70);
  };

  const editMembers = (model: ModelManagmentSchema) => {
    setIsDialogOpen(true);
    setCurrentModel(model);
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
      <AssignMembersToModelDialog
        currentModel={currentModel}
        initialMembersList={organizationMembersList}
        membersList={organizationMembersList}
        setMembersList={setOrganizationMembersList}
        open={isDialogOpen}
        closeDialog={closeDialog}
        refetchModels={refetchModels}
      />
    </>
  );
};
