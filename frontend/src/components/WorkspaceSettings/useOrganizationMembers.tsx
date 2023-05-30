import { useMemo, useState, useEffect } from 'react';

import { MemberSchema, useRetrieveOrganizationMembersApiV1OrganizationMembersGet } from 'api/generated';

function sortMembersList(members: MemberSchema[]) {
  return [...members].sort((a, b) => {
    if (a.full_name && b.full_name) {
      if (a.full_name > b.full_name) return 1;
      if (a.full_name < b.full_name) return -1;
      return 0;
    } else return 0;
  });
}

export const useOrganizationMembers = () => {
  const {
    data: organizationMembers = [],
    isLoading: isOrganizationMembersLoading,
    refetch
  } = useRetrieveOrganizationMembersApiV1OrganizationMembersGet();

  const sortedOrganizationMembers = useMemo(() => sortMembersList(organizationMembers), [organizationMembers]);

  useEffect(() => {
    sortedOrganizationMembers.length && setOrganizationMembersList(sortedOrganizationMembers);
  }, [sortedOrganizationMembers]);

  const [organizationMembersList, setOrganizationMembersList] = useState(sortedOrganizationMembers);

  const refetchOrganizationMembers = () => refetch();

  return {
    sortedOrganizationMembers,
    isOrganizationMembersLoading,
    refetchOrganizationMembers,
    organizationMembersList,
    setOrganizationMembersList
  };
};
