import { GetAlertRulesApiV1AlertRulesGetParams } from 'api/generated';
import React, { createContext, Dispatch, FC, SetStateAction, useContext, useState } from 'react';

interface Context {
  dashboard_id: number;
  models?: [];
  monitors?: [];
  currMonitor?: null;
  alertFilters: GetAlertRulesApiV1AlertRulesGetParams;
  changeAlertFilters: Dispatch<SetStateAction<GetAlertRulesApiV1AlertRulesGetParams>>;
  isLoggedIn: boolean;
}

const initialValue: Context = {
  alertFilters: {},
  changeAlertFilters: () => 1,
  dashboard_id: 1,
  isLoggedIn: false
};

export const GlobalStateContext = createContext<Context>(initialValue);

export const GlobalStateProvider: FC<{ children: JSX.Element }> = ({ children }) => {
  const [alertFilters, setAlertFilters] = useState<GetAlertRulesApiV1AlertRulesGetParams>({});

  return (
    <GlobalStateContext.Provider value={{ ...initialValue, alertFilters, changeAlertFilters: setAlertFilters }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

const useGlobalState = () => useContext(GlobalStateContext);
export default useGlobalState;
