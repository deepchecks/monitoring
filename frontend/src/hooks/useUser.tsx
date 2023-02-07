import { useRetrieveUserInfoApiV1UsersMeGet, UserSchema } from 'api/generated';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hotjar } from 'react-hotjar';
import mixpanel from 'mixpanel-browser';
import { useLDClient } from 'launchdarkly-react-client-sdk';

export type UserProvider = {
  children: JSX.Element;
};

export type UserContext = {
  user: UserSchema | null;
  isUserDetailsComplete: boolean;
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

  const { data } = useRetrieveUserInfoApiV1UsersMeGet();

  const isUserDetailsComplete = !!user?.organization;

  useEffect(() => {
    setUser(data as UserSchema);
  }, [data]);

  useEffect(() => {
    if (!user || isUserDetailsComplete) return;
    navigate('/complete-details');
  }, [user, isUserDetailsComplete]);

  const value = { user, isUserDetailsComplete };
  const ldClient = useLDClient();

  if (user) {
    ldClient?.identify({
      key: user.email,
      email: user.email,
      name: user.full_name,
      custom: { organization: user.organization ? user.organization.id : '' }
    });

    if (isUserDetailsComplete) {
      if (hotjar.initialized()) {
        hotjar.identify('USER_ID', { email: user.email, full_name: user.full_name });
      }

      mixpanel.identify(user.email);
    }
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default useUser;
