import React, { useState, useEffect } from 'react';

import { MemberSchema, useRetrieveOrganizationMembersApiV1OrganizationMembersGet } from 'api/generated';

import { Loader } from 'components/base/Loader/Loader';
import { MembersListActionDialog } from './components/MembersListActionDialog';
import { MembersHeader } from './components/MembersHeader';
import { MembersTable } from './components/MembersTable/MembersTable';
import { DeleteWorkspace } from './components/DeleteWorkspace';

import { MembersActionDialogOptions } from './Members.type';

const Members = () => {
  const {
    data: organizationMembers = [],
    isLoading: isOrganizationMembersLoading,
    refetch
  } = useRetrieveOrganizationMembersApiV1OrganizationMembersGet();

  const [membersList, setMembersList] = useState(organizationMembers);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState(MembersActionDialogOptions.invite);
  const [currentMember, setCurrentMember] = useState<MemberSchema | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<readonly number[]>([]);

  useEffect(() => {
    setMembersList(organizationMembers);
  }, [organizationMembers]);

  const refetchMembers = () => refetch();

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
        organizationMembers={organizationMembers}
        setMembersList={setMembersList}
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
            members={membersList}
            handleOpenActionDialog={handleOpenActionDialog}
          />
          <DeleteWorkspace handleOpenActionDialog={handleOpenActionDialog} />
        </>
      )}
      <MembersListActionDialog
        action={dialogAction}
        members={membersList}
        selectedMembers={selectedMembers}
        currentMember={currentMember}
        open={showActionDialog}
        closeDialog={handleCloseActionDialog}
        refetchMembers={refetchMembers}
      />
    </>
  );
};

export default Members;
