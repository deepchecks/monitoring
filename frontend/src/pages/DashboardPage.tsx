import React, { useState, useCallback } from 'react';

import { MonitorSchema } from 'api/generated';
import useModels from 'hooks/useModels';

import { Grid } from '@mui/material';

import { DashboardHeader } from 'components/Dashboard/DashboardHeader';
import { ModelList } from 'components/Dashboard/ModelList';
import { DataIngestion } from 'components/Dashboard/DataIngestion';
import { MonitorList } from 'components/Dashboard/MonitorList';
import { MonitorDrawer } from 'components/Dashboard/MonitorDrawer';

import { DrawerNames, DrawerNamesMap } from 'components/Dashboard/MonitorDrawer/MonitorDrawer.types';

export const DashboardPage = () => {
  const { models, isLoading } = useModels();

  const [currentMonitor, setCurrentMonitor] = useState<MonitorSchema | null>(null);
  const [currentModelId, setCurrentModelId] = useState<number | null>(null);
  const [monitorToRefreshId, setMonitorToRefreshId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerName, setDrawerName] = useState(DrawerNamesMap.CreateMonitor);

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
      <DashboardHeader onOpen={handleOpenMonitorDrawer} />
      <Grid container spacing={4}>
        <Grid item md={4}>
          <ModelList
            models={models}
            activeModelId={currentModelId}
            filterMonitors={setCurrentModelId}
            isLoading={isLoading}
          />
        </Grid>
        <Grid item md={8}>
          <DataIngestion modelId={currentModelId} />
        </Grid>
        <Grid item md={12}>
          <MonitorList
            currentModelId={currentModelId}
            currentMonitor={currentMonitor}
            setCurrentMonitor={setCurrentMonitor}
            handleOpenMonitorDrawer={handleOpenMonitorDrawer}
            monitorToRefreshId={monitorToRefreshId}
            setMonitorToRefreshId={setMonitorToRefreshId}
          />
        </Grid>
      </Grid>
      <MonitorDrawer
        anchor="right"
        monitor={currentMonitor}
        drawerName={drawerName}
        open={isDrawerOpen}
        onClose={handleCloseMonitorDrawer}
        ModalProps={{ onClose: handleCloseMonitorDrawer }}
        setMonitorToRefreshId={setMonitorToRefreshId}
      />
    </>
  );
};
