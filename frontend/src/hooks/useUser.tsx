import { useRetrieveUserInfoApiV1UsersMeGet, UserSchema } from 'api/generated';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default useUser;
