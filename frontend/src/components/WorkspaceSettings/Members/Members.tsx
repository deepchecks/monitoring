import React, { useState } from 'react';

import { MemberSchema } from 'api/generated';

import { Loader } from 'components/base/Loader/Loader';
import { MembersListActionDialog } from './components/MembersListActionDialog';
import { MembersHeader } from './components/MembersHeader';
import { MembersTable } from './components/MembersTable/MembersTable';
import { DeleteWorkspace } from './components/DeleteWorkspace';

import { MembersActionDialogOptions } from './Members.type';
import { useOrganizationMembers } from '../useOrganizationMembers';

const Members = () => {
  const {
    isOrganizationMembersLoading,
    organizationMembersList,
    refetchOrganizationMembers,
    setOrganizationMembersList,
    sortedOrganizationMembers
  } = useOrganizationMembers();

  const [showActionDialog, setShowActionDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState(MembersActionDialogOptions.invite);
  const [currentMember, setCurrentMember] = useState<MemberSchema | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<readonly number[]>([]);

  const handleOpenActionDialog = (action: MembersActionDialogOptions, member: MemberSchema | null = null) => {
    setDialogAction(action);
    setCurrentMember(member);
    setShowActionDialog(true);
  };

  const handleCloseActionDialog = () => {
    setCurrentMember(null);
    setShowActionDialog(false);
  };

  return (
    <>
      <MembersHeader
        initialMembersList={sortedOrganizationMembers}
        setMembersList={setOrganizationMembersList}
        handleOpenActionDialog={handleOpenActionDialog}
        actionButtonsDisabled={!selectedMembers.length}
      />
      {isOrganizationMembersLoading ? (
        <Loader />
      ) : (
        <>
          <MembersTable
            selected={selectedMembers}
            setSelected={setSelectedMembers}
            members={organizationMembersList}
            handleOpenActionDialog={handleOpenActionDialog}
          />
          <DeleteWorkspace handleOpenActionDialog={handleOpenActionDialog} />
        </>
      )}
      <MembersListActionDialog
        action={dialogAction}
        members={organizationMembersList}
        selectedMembers={selectedMembers}
        setSelectedMembers={setSelectedMembers}
        currentMember={currentMember}
        open={showActionDialog}
        closeDialog={handleCloseActionDialog}
        refetchMembers={refetchOrganizationMembers}
      />
    </>
  );
};

export default Members;
