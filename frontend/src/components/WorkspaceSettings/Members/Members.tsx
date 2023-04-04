import React, { useState, useEffect } from 'react';

import { MemberSchema, useRetrieveOrganizationMembersApiV1OrganizationMembersGet } from 'api/generated';

import { Loader } from 'components/Loader';
import { MembersListActionDialog } from './components/MembersListActionDialog';
import { MembersHeader } from './components/MembersHeader';
import { MembersTable } from './components/MembersTable/MembersTable';

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
      />
      {isOrganizationMembersLoading ? (
        <Loader />
      ) : (
        <MembersTable members={membersList} handleOpenActionDialog={handleOpenActionDialog} />
      )}
      <MembersListActionDialog
        action={dialogAction}
        member={currentMember}
        open={showActionDialog}
        closeDialog={handleCloseActionDialog}
        refetchMembers={refetchMembers}
      />
    </>
  );
};

export default Members;
