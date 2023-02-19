import { useRetrieveAvailableModelsApiV1AvailableModelsGet } from 'api/generated';
import { PathInfo, pathsInfo as paths } from 'helpers/helper';
import React, { createContext, FC, useContext } from 'react';
import { useFlags } from 'launchdarkly-react-client-sdk';
import { ModelsManagement } from 'hooks/useModels';
import { setParams } from 'helpers/utils/getParams';

export interface IContext {
  dashboard_id: number;
  models?: [];
  monitors?: [];
  currMonitor?: null;
  isLoggedIn: boolean;
  pathsInfo: PathInfo[];
  modelsManagement: ModelsManagement;
}

const initialModelsManagement: ModelsManagement = {
  models: [],
  isLoading: false,
  refetch: () => 1
};

const initialValue: IContext = {
  dashboard_id: 1,
  isLoggedIn: false,
  pathsInfo: [],
  modelsManagement: initialModelsManagement
};

export function getAlertFilters() {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  const modelId = +params?.modelId;
  const severity = params?.severity;
  const alertFilters = { models: [] as number[], severity: [] as string[] };
  if (severity) alertFilters['severity'] = [severity];
  if (modelId) alertFilters['models'] = [modelId];
  return alertFilters;
}

export function resetAlertFilters(setAlertFilters: any) {
  setAlertFilters({ models: [], severity: [] });
  setParams('modelId');
  setParams('severity');
}

export const GlobalStateContext = createContext<IContext>(initialValue);

export const GlobalStateProvider: FC<{ children: JSX.Element }> = ({ children }) => {
  const retrieveModelsResponse = useRetrieveAvailableModelsApiV1AvailableModelsGet({
    query: {
      refetchOnWindowFocus: false
    }
  });

  const modelsManagement: ModelsManagement = {
    models: retrieveModelsResponse.data || [],
    isLoading: retrieveModelsResponse.isLoading,
    refetch: retrieveModelsResponse.refetch
  };

  const flags = useFlags();

  let pathsInfo = paths;
  if (!flags.analysisEnabled) {
    pathsInfo = pathsInfo.filter(obj => obj.title !== 'Analysis');
  }

  return (
    <GlobalStateContext.Provider
      value={{
        ...initialValue,
        pathsInfo,
        modelsManagement
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};

const useGlobalState = () => useContext(GlobalStateContext);
export default useGlobalState;
