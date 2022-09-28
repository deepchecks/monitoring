import { GetAlertRulesApiV1AlertRulesGetParams } from 'api/generated';
import React, { createContext, Dispatch, FC, SetStateAction, useCallback, useContext, useState } from 'react';

interface Context {
  dashboard_id: number;
  models?: [];
  monitors?: [];
  currMonitor?: null;
  alertFilters: GetAlertRulesApiV1AlertRulesGetParams;
  changeAlertFilters: Dispatch<SetStateAction<GetAlertRulesApiV1AlertRulesGetParams>>;
  isLoggedIn: boolean;
  resetFilters: () => void;
}

const initialFilters = {
  models: [],
  severity: []
};

const initialValue: Context = {
  alertFilters: initialFilters,
  changeAlertFilters: () => 1,
  dashboard_id: 1,
  isLoggedIn: false,
  resetFilters: () => 1
};

export const GlobalStateContext = createContext<Context>(initialValue);

export const GlobalStateProvider: FC<{ children: JSX.Element }> = ({ children }) => {
  const [alertFilters, setAlertFilters] = useState<GetAlertRulesApiV1AlertRulesGetParams>(initialFilters);

  const resetFilters = useCallback(() => {
    setAlertFilters(initialFilters);
  }, [setAlertFilters]);

  return (
    <GlobalStateContext.Provider
      value={{ ...initialValue, alertFilters, changeAlertFilters: setAlertFilters, resetFilters }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};

const useGlobalState = () => useContext(GlobalStateContext);
export default useGlobalState;
