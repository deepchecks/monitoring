import { GetAlertRulesApiV1AlertRulesGetParams } from 'api/generated';
import { PathInfo, pathsInfo as paths } from 'helpers/helper';
import React, { createContext, Dispatch, FC, SetStateAction, useCallback, useContext, useState } from 'react';
import { useFlags } from 'launchdarkly-react-client-sdk'

export interface IContext {
  dashboard_id: number;
  models?: [];
  monitors?: [];
  currMonitor?: null;
  alertFilters: GetAlertRulesApiV1AlertRulesGetParams;
  changeAlertFilters: Dispatch<SetStateAction<GetAlertRulesApiV1AlertRulesGetParams>>;
  isLoggedIn: boolean;
  resetFilters: () => void;
  pathsInfo: PathInfo[];
}

const initialFilters = {
  models: [],
  severity: []
};

const initialValue: IContext = {
  alertFilters: initialFilters,
  changeAlertFilters: () => 1,
  dashboard_id: 1,
  isLoggedIn: false,
  resetFilters: () => 1,
  pathsInfo: []
};

export const GlobalStateContext = createContext<IContext>(initialValue);

export const GlobalStateProvider: FC<{ children: JSX.Element }> = ({ children }) => {
  const [alertFilters, setAlertFilters] = useState<GetAlertRulesApiV1AlertRulesGetParams>(initialFilters);

  const resetFilters = useCallback(() => {
    setAlertFilters(initialFilters);
  }, [setAlertFilters]);

  const flags = useFlags();

  let pathsInfo = paths;
  if (!flags.analysisEnabled) {
    pathsInfo = pathsInfo.filter(obj => obj.title !== 'Analysis')
  }

  return (
    <GlobalStateContext.Provider
      value={{ ...initialValue, alertFilters, changeAlertFilters: setAlertFilters, resetFilters, pathsInfo }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};

const useGlobalState = () => useContext(GlobalStateContext);
export default useGlobalState;
