import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hotjar } from 'react-hotjar';
import mixpanel from 'mixpanel-browser';

import { useRetrieveUserInfoApiV1UsersMeGet, UserSchema } from 'api/generated';

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
