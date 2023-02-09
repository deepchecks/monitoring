import React, { useState, useCallback, useContext } from 'react';

import { MonitorSchema, useGetOrCreateDashboardApiV1DashboardsGet } from 'api/generated';
import useModels from 'hooks/useModels';
import { GlobalStateContext } from 'context';

import { Grid } from '@mui/material';

import { ModelList } from 'components/Dashboard/ModelList';
import { DataIngestion } from 'components/Dashboard/DataIngestion';
import { MonitorListHeader } from 'components/Dashboard/MonitorListHeader';
import { MonitorList } from 'components/Dashboard/MonitorList';
import { MonitorDrawer } from 'components/Dashboard/MonitorDrawer';

import { DrawerNames } from 'components/Dashboard/Dashboard.types';

export const DashboardPage = () => {
  const { models, isLoading: isModelsLoading } = useModels();

  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    refetch
  } = useGetOrCreateDashboardApiV1DashboardsGet({
    query: {
      refetchOnWindowFocus: false
    }
  });

  function refetchMonitors() {
    refetch();
  }

  const [currentMonitor, setCurrentMonitor] = useState<MonitorSchema | null>(null);
  const { selectedModelId: currentModelId } = useContext(GlobalStateContext);
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
          <ModelList models={models} isLoading={isModelsLoading} />
        </Grid>
        <Grid item md={6} lg={6} xl={8}>
          <DataIngestion modelId={currentModelId} />
        </Grid>
        <Grid item md={12}>
          <MonitorListHeader onClick={handleOpenMonitorDrawer} />
        </Grid>
        <Grid item md={12}>
          <MonitorList
            dashboard={dashboard}
            currentModelId={currentModelId}
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
      />
    </>
  );
};

export default DashboardPage;
