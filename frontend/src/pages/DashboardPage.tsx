import React, { useState } from 'react';
import { DashboardHeader } from '../components/DashboardHeader';
import { GraphicsSection } from '../components/GraphicsSection/GraphicsSection';
import { Loader } from '../components/Loader';
import { ModelList } from '../components/ModelList';
import MonitorDrawer, { DrawerNames, DrawerNamesMap } from '../components/MonitorDrawer/MonitorDrawer';

import { Grid } from '@mui/material';
import { DataIngestion } from 'components/DataIngestion/DataIngestion';
import DeleteMonitor from 'components/MonitorDrawer/MonitorForm/DeleteMonitor';
import {
  MonitorSchema,
  useDeleteMonitorApiV1MonitorsMonitorIdDelete,
  useGetModelsApiV1ModelsGet
} from '../api/generated';
import useMonitorsData from '../hooks/useMonitorsData';

export const DashboardPage = () => {
  const { data: models = [] } = useGetModelsApiV1ModelsGet();
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isDeleteMonitorDialogOpen, setIsDeleteMonitorDialogOpen] = useState<boolean>(false);
  const [currMonitor, setCurrMonitor] = useState<MonitorSchema>();
  const [drawerName, setDrawerName] = useState<DrawerNames>(DrawerNamesMap.CreateMonitor);
  const { monitors, chartDataList, refreshMonitors } = useMonitorsData();

  const handleOpenMonitorDrawer = (drawerName: DrawerNames, monitor?: MonitorSchema) => {
    if (monitor) {
      setCurrMonitor(monitor);
    }
    setDrawerName(drawerName);
    setIsDrawerOpen(true);
  };

  const handleCloseMonitor = () => {
    setCurrMonitor(undefined);
    setIsDrawerOpen(false);
  };
  const { mutateAsync: DeleteMonitorById, isLoading } = useDeleteMonitorApiV1MonitorsMonitorIdDelete();

  const handleOpenDeleteMonitorDialog = (monitor: MonitorSchema) => {
    setCurrMonitor(monitor);
    setIsDeleteMonitorDialogOpen(true);
  };

  const handleDeleteMonitor = async (confirm: boolean) => {
    if (!currMonitor) return;
    if (!confirm) return setIsDeleteMonitorDialogOpen(false);
    window.scrollTo(0, 0);
    await DeleteMonitorById({ monitorId: currMonitor.id });
    setIsDeleteMonitorDialogOpen(false);
    setCurrMonitor(undefined);
    refreshMonitors();
  };

  if (!monitors) return <Loader />;

  return (
    <>
      <DashboardHeader onOpen={handleOpenMonitorDrawer} />
      {isLoading ? (
        <Loader />
      ) : (
        <Grid container spacing={4}>
          <Grid item lg={5} md={4}>
            <ModelList models={models} />
          </Grid>
          <Grid item lg={7} md={8}>
            <DataIngestion />
          </Grid>
          {!chartDataList.length ? (
            <Loader sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          ) : (
            chartDataList.map((chartData, index) => (
              <Grid item md={6} lg={6} xl={4} key={index}>
                <GraphicsSection
                  data={chartData as any}
                  monitor={monitors[index]}
                  onOpen={handleOpenMonitorDrawer}
                  onDelete={handleOpenDeleteMonitorDialog}
                  models={models}
                />
              </Grid>
            ))
          )}
          {currMonitor && (
            <DeleteMonitor
              setIsOpen={setIsDeleteMonitorDialogOpen}
              onClick={handleDeleteMonitor}
              isOpen={isDeleteMonitorDialogOpen}
              monitor={currMonitor}
            />
          )}
          <MonitorDrawer
            anchor="right"
            monitor={currMonitor}
            drawerName={drawerName}
            open={isDrawerOpen}
            onClose={handleCloseMonitor}
          />
        </Grid>
      )}
    </>
  );
};
