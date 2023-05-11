import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { MonitorSchema, useGetOrCreateDashboardApiV1DashboardsGet } from 'api/generated';

import { Grid } from '@mui/material';

import { ModelList } from 'components/Dashboard/ModelList';
import { DataIngestion } from 'components/Dashboard/DataIngestion';
import { MonitorListHeader } from 'components/Dashboard/MonitorListHeader/MonitorListHeader';
import { MonitorList } from 'components/Dashboard/MonitorList';
import { MonitorDrawer } from 'components/Dashboard/MonitorDrawer';
import { DrawerNames } from 'components/Dashboard/Dashboard.types';

import { getParams } from 'helpers/utils/getParams';
import { featuresList, usePermissionControl } from 'helpers/permissionControl';

export const DashboardPage = () => {
  const navigate = useNavigate();
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

  function refetchMonitors() {
    refetch();
  }

  const [currentMonitor, setCurrentMonitor] = useState<MonitorSchema | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(+getParams()?.modelId || null);
  const [monitorToRefreshId, setMonitorToRefreshId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerName, setDrawerName] = useState(DrawerNames.CreateMonitor);

  const handleOpenMonitorDrawer = (drawerName: DrawerNames, monitor?: MonitorSchema) => {
    if (monitor) setCurrentMonitor(monitor);
    setDrawerName(drawerName);
    setIsDrawerOpen(true);
  };

  const handleCloseMonitorDrawer = useCallback(() => {
    setCurrentMonitor(null);
    setIsDrawerOpen(false);
  }, []);

  useEffect(() => {
    if (dashboard?.monitors?.length === 0 && onboardingEnabled) {
      navigate({ pathname: '/onboarding' });
    }
  }, [dashboard, onboardingEnabled]);

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
    </>
  );
};

export default DashboardPage;
