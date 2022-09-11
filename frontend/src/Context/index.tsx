import { createContext, useContext, FC } from 'react';

interface ContextInterface {
  dashboard_id: number;
}

const GlobalStateContext = createContext<ContextInterface>({
  dashboard_id: 1
} as ContextInterface);

export const GlobalStateProvider: FC<{ children: JSX.Element }> = ({ children }) => (
  <GlobalStateContext.Provider value={{ dashboard_id: 1 }}>{children}</GlobalStateContext.Provider>
);

const useGlobalState = () => useContext(GlobalStateContext);
export default useGlobalState;
