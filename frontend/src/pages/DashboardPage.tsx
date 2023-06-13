import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  MonitorSchema,
  useGetOrCreateDashboardApiV1DashboardsGet,
  useRetrieveBackendVersionApiV1BackendVersionGet
} from 'api/generated';

import { Grid, Snackbar, Alert } from '@mui/material';

import { ModelList } from 'components/Dashboard/ModelList';
import { DataIngestion } from 'components/Dashboard/DataIngestion';
import { MonitorListHeader } from 'components/Dashboard/MonitorListHeader/MonitorListHeader';
import { MonitorList } from 'components/Dashboard/MonitorList';
import { MonitorDrawer } from 'components/Dashboard/MonitorDrawer';
import { DrawerNames } from 'components/Dashboard/Dashboard.types';

import { getParams } from 'helpers/utils/getParams';
import { featuresList, usePermissionControl } from 'helpers/base/permissionControl';
import { getStorageItem, setStorageItem, storageKeys } from 'helpers/utils/localStorage';
import { ONE_MINUTE, THIRTY_SECONDS } from 'helpers/base/time';

const constants = { snackbarAlertMessage: 'Initial first load can take a few minutes, we are processing your data' };

let TIMEOUT: NodeJS.Timeout;

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: versionData } = useRetrieveBackendVersionApiV1BackendVersionGet();
  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    refetch
  } = useGetOrCreateDashboardApiV1DashboardsGet({
    query: {
      refetchOnWindowFocus: false,
      refetchInterval: ONE_MINUTE
    }
  });

  function refetchMonitors() {
    refetch();
  }

  const [currentMonitor, setCurrentMonitor] = useState<MonitorSchema | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(+getParams()?.modelId || null);
  const [monitorToRefreshId, setMonitorToRefreshId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerName, setDrawerName] = useState(DrawerNames.CreateMonitor);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleOpenMonitorDrawer = (drawerName: DrawerNames, monitor?: MonitorSchema) => {
    if (monitor) setCurrentMonitor(monitor);
    setDrawerName(drawerName);
    setIsDrawerOpen(true);
  };

  const handleCloseMonitorDrawer = useCallback(() => {
    setCurrentMonitor(null);
    setIsDrawerOpen(false);
  }, []);

  const onboardingEnabled = usePermissionControl({ feature: featuresList.onboarding_enabled });

  const isCloud = getStorageItem(storageKeys.environment)['is_cloud'];

  useEffect(() => {
    if (dashboard?.monitors?.length === 0 && (onboardingEnabled || !isCloud)) {
      navigate({ pathname: '/onboarding' });
    }
  }, [dashboard, onboardingEnabled]);

  useEffect(() => {
    if (!dashboard) {
      TIMEOUT = setTimeout(() => setSnackbarOpen(true), THIRTY_SECONDS);
    } else {
      clearTimeout(TIMEOUT);
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
          <MonitorListHeader onClick={handleOpenMonitorDrawer} />
        </Grid>
        <Grid item md={12}>
          <MonitorList
            dashboard={dashboard}
            currentModelId={selectedModelId}
            currentMonitor={currentMonitor}
            setCurrentMonitor={setCurrentMonitor}
            handleOpenMonitorDrawer={handleOpenMonitorDrawer}
            monitorToRefreshId={monitorToRefreshId}
            setMonitorToRefreshId={setMonitorToRefreshId}
            isLoading={isDashboardLoading}
          />
        </Grid>
      </Grid>
      <MonitorDrawer
        monitor={currentMonitor}
        refetchMonitors={refetchMonitors}
        drawerName={drawerName}
        open={isDrawerOpen}
        onClose={handleCloseMonitorDrawer}
        setMonitorToRefreshId={setMonitorToRefreshId}
        selectedModelId={selectedModelId}
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
