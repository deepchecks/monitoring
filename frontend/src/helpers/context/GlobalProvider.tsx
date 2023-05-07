import React, { createContext, FC, useContext } from 'react';

import { PathInfo, pathsInfo } from 'helpers/routes';

export interface IContext {
  dashboard_id: number;
  models?: [];
  monitors?: [];
  currMonitor?: null;
  isLoggedIn: boolean;
  pathsInfo: PathInfo[];
  flags: { [key: string]: boolean };
}

const initialValue: IContext = {
  dashboard_id: 1,
  isLoggedIn: false,
  pathsInfo: [],
  flags: {}
};

export const GlobalStateContext = createContext<IContext>(initialValue);

export const GlobalStateProvider: FC<{ children: JSX.Element }> = ({ children }) => (
  <GlobalStateContext.Provider
    value={{
      ...initialValue,
      pathsInfo
    }}
  >
    {children}
  </GlobalStateContext.Provider>
);

const useGlobalState = () => useContext(GlobalStateContext);
export default useGlobalState;
