import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  MonitorSchema,
  useGetOrCreateDashboardApiV1DashboardsGet,
  useRetrieveBackendVersionApiV1BackendVersionGet
} from 'api/generated';

import { Grid } from '@mui/material';

import { ModelList } from 'components/Dashboard/ModelList';
import { DataIngestion } from 'components/Dashboard/DataIngestion';
import { MonitorListHeader } from 'components/Dashboard/MonitorListHeader/MonitorListHeader';
import { MonitorList } from 'components/Dashboard/MonitorList';
import { MonitorDialog } from 'components/Dashboard/MonitorDialog';
import { DialogNames } from 'components/Dashboard/Dashboard.types';

import { getParams } from 'helpers/utils/getParams';
import { featuresList, usePermissionControl } from 'helpers/base/permissionControl';
import { getStorageItem, setStorageItem, storageKeys } from 'helpers/utils/localStorage';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: versionData } = useRetrieveBackendVersionApiV1BackendVersionGet();
  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    refetch
  } = useGetOrCreateDashboardApiV1DashboardsGet({
    query: {
      refetchOnWindowFocus: false
    }
  });
  const onboardingEnabled = usePermissionControl({ feature: featuresList.onboarding_enabled });

  const isCloud = getStorageItem(storageKeys.environment)['is_cloud'];

  function refetchMonitors() {
    refetch();
  }

  const [currentMonitor, setCurrentMonitor] = useState<MonitorSchema | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(+getParams()?.modelId || null);
  const [monitorToRefreshId, setMonitorToRefreshId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dialogName, setDialogName] = useState(DialogNames.CreateMonitor);

  const handleOpenMonitorDialog = (dialogName: DialogNames, monitor?: MonitorSchema) => {
    if (monitor) setCurrentMonitor(monitor);
    setDialogName(dialogName);
    setIsDrawerOpen(true);
  };

  const handleCloseMonitorDialog = useCallback(() => {
    setCurrentMonitor(null);
    setIsDrawerOpen(false);
  }, []);

  useEffect(() => {
    if (dashboard?.monitors?.length === 0 && (onboardingEnabled || !isCloud)) {
      navigate({ pathname: '/onboarding' });
    }
  }, [dashboard, onboardingEnabled]);

  useEffect(() => {
    // Update user version
    const userStorageData = getStorageItem(storageKeys.user);

    setStorageItem(storageKeys.user, {
      ...userStorageData,
      o_version: (versionData as any)?.version,
      o_deployment: isCloud ? 'saas' : 'on-prem'
    });
  }, [versionData]);

  return (
    <>
      <Grid
        container
        sx={{
          padding: '30px 0',
          maxWidth: { xs: 'calc(100vw - 196px - 65px)', xl: 'calc(100vw - 237px - 65px)' }
        }}
        spacing={{ md: 2.5, xl: 4 }}
      >
        <Grid item md={6} lg={6} xl={4}>
          <ModelList selectedModelId={selectedModelId} setSelectedModelId={setSelectedModelId} />
        </Grid>
        <Grid item md={6} lg={6} xl={8}>
          <DataIngestion modelId={selectedModelId} />
        </Grid>
        <Grid item md={12}>
          <MonitorListHeader onClick={handleOpenMonitorDialog} />
        </Grid>
        <Grid item md={12}>
          <MonitorList
            dashboard={dashboard}
            currentModelId={selectedModelId}
            currentMonitor={currentMonitor}
            setCurrentMonitor={setCurrentMonitor}
            handleOpenMonitorDialog={handleOpenMonitorDialog}
            monitorToRefreshId={monitorToRefreshId}
            setMonitorToRefreshId={setMonitorToRefreshId}
            isLoading={isDashboardLoading}
          />
        </Grid>
      </Grid>
      <MonitorDialog
        monitor={currentMonitor}
        refetchMonitors={refetchMonitors}
        dialogName={dialogName}
        open={isDrawerOpen}
        onClose={handleCloseMonitorDialog}
        setMonitorToRefreshId={setMonitorToRefreshId}
        selectedModelId={selectedModelId}
      />
    </>
  );
};

export default DashboardPage;
