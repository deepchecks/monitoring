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
import { setStorageItem, storageKeys } from 'helpers/utils/localStorage';

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
  isLoading: boolean;
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

  const { data, refetch, isLoading } = useRetrieveUserInfoApiV1UsersMeGet({
    query: {
      refetchOnWindowFocus: false
    }
  });

  const refetchUser = () => refetch();

  const userRole = data?.roles.includes('admin') ? (data?.roles.includes('owner') ? 'owner' : 'admin') : 'member';
  const isUserDetailsComplete = !!user?.organization;

  useEffect(() => {
    setUser(data as UserSchema);

    setStorageItem(storageKeys.user, {
      u_id: data?.id,
      u_role: userRole,
      u_email: data?.email,
      u_name: data?.full_name,
      u_org: data?.organization?.name,
      u_created_at: data?.created_at,
      o_tier: data?.organization?.tier,
      o_name: data?.organization?.name
    });
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
      user?.email && mixpanel.identify(user?.email);
    }
  }, [user]);

  useEffect(() => {
    setStorageItem(storageKeys.loggedIn, true);
  }, []);

  const value = { user, isUserDetailsComplete, availableFeatures, isAdmin, isOwner, refetchUser, isLoading };

  if (user && isUserDetailsComplete && hotjar.initialized()) {
    hotjar.identify('USER_ID', { email: user.email, full_name: user.full_name });
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default useUser;
