import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hotjar } from 'react-hotjar';
import mixpanel from 'mixpanel-browser';

import {
  useRetrieveUserInfoApiV1UsersMeGet,
  UserSchema,
  getAvailableFeaturesApiV1OrganizationAvailableFeaturesGet,
  FeaturesSchema,
  RoleEnum
} from 'api/generated';

import { resError } from 'helpers/types/resError';

export type UserProvider = {
  children: JSX.Element;
};

export type UserContext = {
  user: UserSchema | null;
  isUserDetailsComplete: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  availableFeatures: FeaturesSchema | undefined;
  refetchUser: () => void;
};

const UserContext = createContext<UserContext | null>(null);

const useUser = () => {
  const context = useContext(UserContext);
  if (context === null) throw Error('UserContext is null');

  return context;
};

export const UserProvider = ({ children }: UserProvider): JSX.Element => {
  const navigate = useNavigate();

  const [user, setUser] = useState<UserSchema | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [availableFeatures, setAvailableFeatures] = useState<FeaturesSchema>();

  const { data, refetch } = useRetrieveUserInfoApiV1UsersMeGet({
    query: {
      refetchOnWindowFocus: false
    }
  });

  const refetchUser = () => refetch();

  const isUserDetailsComplete = !!user?.organization;

  useEffect(() => {
    setUser(data as UserSchema);
  }, [data]);

  useEffect(() => {
    if (!user || isUserDetailsComplete) return;
    navigate('/complete-details');
  }, [user, isUserDetailsComplete]);

  useEffect(() => {
    async function getAvailableFeatures() {
      const response: FeaturesSchema = await getAvailableFeaturesApiV1OrganizationAvailableFeaturesGet();
      if (response && !(response as unknown as resError).error_message) setAvailableFeatures(response);
    }

    if (user) {
      getAvailableFeatures();
      setIsAdmin(!!user?.roles.includes(RoleEnum.admin));
      setIsOwner(!!user?.roles.includes(RoleEnum.owner));
    }
  }, [user]);

  const value = { user, isUserDetailsComplete, availableFeatures, isAdmin, isOwner, refetchUser };

  if (user) {
    if (isUserDetailsComplete) {
      if (hotjar.initialized()) {
        hotjar.identify('USER_ID', { email: user.email, full_name: user.full_name });
      }

      mixpanel.identify(`${user.id}`);
      mixpanel.set_group('organization', `${user.organization?.name}(ID-${user.organization?.id})`);
    }
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default useUser;
