import React, { useState } from 'react';
import { GraphicsSection } from '../components/GraphicsSection/GraphicsSection';
import { ModelList } from '../components/ModelList';
import MonitorDrawer from '../components/MonitorDrawer/MonitorDrawer';
import { DashboardHeader } from '../components/DashboardHeader';
import { Loader } from '../components/Loader';

import {
  MonitorSchema,
  useDeleteMonitorApiV1MonitorsMonitorIdDelete,
  useGetModelsApiV1ModelsGet
} from '../api/generated';
import { Grid } from '@mui/material';
import { DataIngestion } from 'components/DataIngestion/DataIngestion';
import useMonitorsData from '../hooks/useMonitorsData';
import DeleteMonitor from 'components/MonitorDrawer/MonitorForm/DeleteMonitor';

export const DashboardPage = () => {
  const { data: models = [] } = useGetModelsApiV1ModelsGet();
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isDeleteMonitorDialogOpen, setIsDeleteMonitorDialogOpen] = useState<boolean>(false);
  const [currMonitor, setCurrMonitor] = useState<MonitorSchema>();
  const { monitors, chartDataList, refreshMonitors } = useMonitorsData();

  const handleOpenMonitorDrawer = (monitor?: MonitorSchema) => {
    if (monitor) {
      setCurrMonitor(monitor);
    }
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
          <MonitorDrawer monitor={currMonitor} anchor="right" open={isDrawerOpen} onClose={handleCloseMonitor} />
        </Grid>
      )}
    </>
  );
};
