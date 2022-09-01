import { createContext, useContext, FC } from 'react';

interface ContextInterface {
  dashboard_id: number;
}

const ManagementGlobalStateContext = createContext<ContextInterface>({
  dashboard_id: 1
});

export const GlobalStateProvider: FC<{ children: JSX.Element }> = ({ children }) => {
  console.log('Creating context.');

  return (
    <ManagementGlobalStateContext.Provider value={{ dashboard_id: 1 }}>
      {children}
    </ManagementGlobalStateContext.Provider>
  );
};

const useGlobalState = () => useContext(ManagementGlobalStateContext);
export default useGlobalState;
