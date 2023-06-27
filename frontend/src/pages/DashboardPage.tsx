import React, { useState, useEffect, useCallback } from 'react';

import {
  MonitorSchema,
  useGetOrCreateDashboardApiV1DashboardsGet,
  useRetrieveBackendVersionApiV1BackendVersionGet,
  CheckSchema,
  MonitorCheckConfSchema,
  MonitorCheckConf,
  ModelManagmentSchema
} from 'api/generated';

import { Grid, Snackbar, Alert } from '@mui/material';

import { ModelList } from 'components/Dashboard/ModelList';
import { DataIngestion } from 'components/Dashboard/DataIngestion';
import { MonitorListHeader } from 'components/Dashboard/MonitorListHeader/MonitorListHeader';
import { MonitorList } from 'components/Dashboard/MonitorList';
import { MonitorDialog } from 'components/Dashboard/MonitorDialog';
import { AnalysisDrillDown } from 'components/AnalysisDrillDown';

import { getParams } from 'helpers/utils/getParams';
import { getStorageItem, setStorageItem, storageKeys } from 'helpers/utils/localStorage';
import { ONE_MINUTE, THIRTY_SECONDS } from 'helpers/base/time';
import useOnboarding from 'helpers/hooks/useOnboarding';
import { CheckType } from 'helpers/types/check';
import { onDrawerOpen } from 'components/AnalysisDrillDown/AnalysisDrillDown.helpers';
import { DialogNames } from 'components/Dashboard/Dashboard.types';
import { emptyModel } from 'helpers/hooks/useModels';

const constants = { snackbarAlertMessage: 'Initial first load can take a few minutes, we are processing your data' };

let timeout: NodeJS.Timeout;

export const DashboardPage = () => {
  const { data: versionData } = useRetrieveBackendVersionApiV1BackendVersionGet();
  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    refetch: refetchMonitors
  } = useGetOrCreateDashboardApiV1DashboardsGet({
    query: {
      refetchOnWindowFocus: false,
      refetchInterval: ONE_MINUTE
    }
  });

  const [selectedModelId, setSelectedModelId] = useState<number | null>(+getParams()?.modelId || null);
  const [monitorToRefreshId, setMonitorToRefreshId] = useState<number | null>(null);
  const [currentMonitor, setCurrentMonitor] = useState<MonitorSchema | null>(null);
  const [currentModel, setCurrentModel] = useState<ModelManagmentSchema>(emptyModel);
  const [currentCheck, setCurrentCheck] = useState<CheckSchema | null>(null);
  const [currentDatasetName, setCurrentDatasetName] = useState<string | null>(null);
  const [currentAdditionalKwargs, setCurrentAdditionalKwargs] = useState<MonitorCheckConfSchema | null>(null);
  const [currentModelVersionId, setCurrentModelVersionId] = useState<number | null>(null);
  const [currentTimeLabel, setCurrentTimeLabel] = useState<number | null>(null);
  const [currentType, setCurrentType] = useState<CheckType>(null);

  const [dialogName, setDialogName] = useState(DialogNames.CreateMonitor);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleOpenMonitorDialog = (dialogName: DialogNames, monitor?: MonitorSchema) => {
    if (monitor) setCurrentMonitor(monitor);
    setDialogName(dialogName);
    setIsDialogOpen(true);
  };

  const handleCloseMonitorDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => setCurrentMonitor(null), 100);
  };

  const isCloud = getStorageItem(storageKeys.environment)['is_cloud'];

  useEffect(() => {
    if (!dashboard) {
      timeout = setTimeout(() => setSnackbarOpen(true), THIRTY_SECONDS);
    } else {
      clearTimeout(timeout);
    }
  }, [dashboard]);

  useEffect(() => {
    // Update user version
    const userStorageData = getStorageItem(storageKeys.user);

    setStorageItem(storageKeys.user, {
      ...userStorageData,
      o_version: (versionData as any)?.version,
      o_deployment: isCloud ? 'saas' : 'on-prem'
    });
  }, [versionData]);

  useOnboarding();

  const handleDrawerOpen = useCallback(
    (
      datasetName: string,
      versionName: string,
      timeLabel: number,
      additionalKwargs: MonitorCheckConfSchema | undefined,
      checkInfo: MonitorCheckConf | undefined,
      check: CheckSchema,
      currentModel: ModelManagmentSchema
    ) =>
      onDrawerOpen(
        datasetName,
        versionName,
        timeLabel,
        additionalKwargs,
        checkInfo,
        check,
        setIsDrawerOpen,
        setCurrentType,
        setCurrentAdditionalKwargs,
        setCurrentDatasetName,
        setCurrentModelVersionId,
        setCurrentTimeLabel,
        setCurrentCheck,
        currentModel
      ),
    [currentModel.versions]
  );

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setCurrentCheck(null);
    setCurrentDatasetName(null);
    setCurrentAdditionalKwargs(null);
    setCurrentModelVersionId(null);
    setCurrentTimeLabel(null);
    setCurrentType(null);
    setCurrentModel(emptyModel);
  };

  return (
    <>
      <Grid
        container
        sx={{
          padding: '30px 0',
          maxWidth: { lg: '100vw', xl: '100vw - 280px' }
        }}
        spacing={{ md: 2.5, xl: 4 }}
      >
        <Grid item md={6} lg={6} xl={4} width="100%">
          <ModelList selectedModelId={selectedModelId} setSelectedModelId={setSelectedModelId} />
        </Grid>
        <Grid item md={6} lg={6} xl={8} width="100%" marginTop="24px">
          <DataIngestion modelId={selectedModelId} />
        </Grid>
        <Grid item md={12} width="100%">
          <MonitorListHeader onClick={handleOpenMonitorDialog} />
        </Grid>
        <Grid item md={12} width="100%">
          <MonitorList
            dashboard={dashboard}
            currentModelId={selectedModelId}
            currentMonitor={currentMonitor}
            setCurrentMonitor={setCurrentMonitor}
            handleOpenMonitorDialog={handleOpenMonitorDialog}
            monitorToRefreshId={monitorToRefreshId}
            setMonitorToRefreshId={setMonitorToRefreshId}
            isLoading={isDashboardLoading}
            onPointClick={handleDrawerOpen}
            setCurrentModel={setCurrentModel}
          />
        </Grid>
      </Grid>
      <MonitorDialog
        monitor={currentMonitor}
        refetchMonitors={refetchMonitors}
        dialogName={dialogName}
        open={isDialogOpen}
        onClose={handleCloseMonitorDialog}
        setMonitorToRefreshId={setMonitorToRefreshId}
        selectedModelId={selectedModelId}
      />
      <AnalysisDrillDown
        modelName={currentModel.name}
        datasetName={currentDatasetName}
        check={currentCheck}
        modelVersionId={currentModelVersionId}
        open={isDrawerOpen}
        onClose={handleDrawerClose}
        onCloseIconClick={handleDrawerClose}
        timeLabel={currentTimeLabel}
        additionalKwargs={currentAdditionalKwargs}
        type={currentType}
      />
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        autoHideDuration={6000}
      >
        <Alert severity="warning">{constants.snackbarAlertMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default DashboardPage;
