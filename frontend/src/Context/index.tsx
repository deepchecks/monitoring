import React, { createContext, useContext, FC } from 'react';

interface ContextInterface {
  dashboard_id: number;
  models?: [];
  monitors?: [];
  currMonitor?: null;
}

const initState = {
  dashboard_id: 1
};

const GlobalStateContext = createContext<ContextInterface>(initState as ContextInterface);

export const GlobalStateProvider: FC<{ children: JSX.Element }> = ({ children }) => (
  <GlobalStateContext.Provider value={{ dashboard_id: 1 }}>{children}</GlobalStateContext.Provider>
);

const useGlobalState = () => useContext(GlobalStateContext);
export default useGlobalState;
