import { useState, useEffect } from 'react';

import { useRetrieveOrganizationMembersApiV1OrganizationMembersGet } from 'api/generated';


export const useOrganizationMembers = () => {
  const {
    data: organizationMembers = [],
    isLoading: isOrganizationMembersLoading,
    refetch
  } = useRetrieveOrganizationMembersApiV1OrganizationMembersGet();

  useEffect(() => {
    organizationMembers.length && setOrganizationMembersList(organizationMembers);
  }, [organizationMembers]);

  const [organizationMembersList, setOrganizationMembersList] = useState(organizationMembers);

  const refetchOrganizationMembers = () => refetch();

  return {
    isOrganizationMembersLoading,
    refetchOrganizationMembers,
    organizationMembersList,
    setOrganizationMembersList
  };
};
