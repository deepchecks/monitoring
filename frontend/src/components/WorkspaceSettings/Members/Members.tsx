import React, { useState, useEffect, useMemo } from 'react';

import { MemberSchema, useRetrieveOrganizationMembersApiV1OrganizationMembersGet } from 'api/generated';

import { Loader } from 'components/base/Loader/Loader';
import { MembersListActionDialog } from './components/MembersListActionDialog';
import { MembersHeader } from './components/MembersHeader';
import { MembersTable } from './components/MembersTable/MembersTable';
import { DeleteWorkspace } from './components/DeleteWorkspace';

import { MembersActionDialogOptions } from './Members.type';

function sortMembersList(members: MemberSchema[]) {
  return [...members].sort((a, b) => {
    if (a.full_name && b.full_name) {
      if (a.full_name > b.full_name) return 1;
      if (a.full_name < b.full_name) return -1;
      return 0;
    } else return 0;
  });
}

const Members = () => {
  const {
    data: organizationMembers = [],
    isLoading: isOrganizationMembersLoading,
    refetch
  } = useRetrieveOrganizationMembersApiV1OrganizationMembersGet();

  const sortedOrganizationMembers = useMemo(() => sortMembersList(organizationMembers), [organizationMembers]);

  const [membersList, setMembersList] = useState(sortedOrganizationMembers);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState(MembersActionDialogOptions.invite);
  const [currentMember, setCurrentMember] = useState<MemberSchema | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<readonly number[]>([]);

  useEffect(() => {
    setMembersList(sortedOrganizationMembers);
  }, [sortedOrganizationMembers]);

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
        initialMembersList={sortedOrganizationMembers}
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
        setSelectedMembers={setSelectedMembers}
        currentMember={currentMember}
        open={showActionDialog}
        closeDialog={handleCloseActionDialog}
        refetchMembers={refetchMembers}
      />
    </>
  );
};

export default Members;
