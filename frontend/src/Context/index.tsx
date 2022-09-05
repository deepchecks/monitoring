import React, { createContext, useContext, FC } from 'react';

interface ContextInterface {
  dashboard_id: number;
  isLoggedIn: boolean;
}

const GlobalStateContext = createContext<ContextInterface>({
  dashboard_id: 1,
  isLoggedIn: false
});

export const GlobalStateProvider: FC<{ children: JSX.Element }> = ({ children }) => {
  console.log('Creating context.');

  return (
    <GlobalStateContext.Provider value={{ dashboard_id: 1, isLoggedIn: false }}>{children}</GlobalStateContext.Provider>
  );
};

const useGlobalState = () => useContext(GlobalStateContext);
export default useGlobalState;
