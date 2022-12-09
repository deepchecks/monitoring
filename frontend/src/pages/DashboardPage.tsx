import React, { useState, useCallback } from 'react';
import mixpanel from 'mixpanel-browser';

import { MonitorSchema, useDeleteMonitorApiV1MonitorsMonitorIdDelete } from '../api/generated';
import useModels from 'hooks/useModels';
import useMonitorsData from '../hooks/useMonitorsData';

import { Grid } from '@mui/material';

import { DashboardHeader } from '../components/DashboardHeader';
import { GraphicsSection } from '../components/GraphicsSection/GraphicsSection';
import { Loader } from '../components/Loader';
import { ModelList } from '../components/ModelList';
import MonitorDrawer from 'components/MonitorDrawer/MonitorDrawer';
import { DataIngestion } from 'components/DataIngestion/DataIngestion';
import DeleteMonitor from 'components/MonitorDrawer/MonitorForm/DeleteMonitor';

import { DrawerNames, DrawerNamesMap } from '../components/MonitorDrawer/MonitorDrawer.types';

export const DashboardPage = () => {
  const { models } = useModels();
  const { monitors, chartDataList, refreshMonitors } = useMonitorsData();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDeleteMonitorDialogOpen, setIsDeleteMonitorDialogOpen] = useState(false);
  const [currMonitor, setCurrMonitor] = useState<MonitorSchema>();
  const [drawerName, setDrawerName] = useState<DrawerNames>(DrawerNamesMap.CreateMonitor);
  const [currentModelId, setCurrentModelId] = useState<number | null>(null);

  let prevModelId = -1;
  let isBlack = true;

  const handleOpenMonitorDrawer = (drawerName: DrawerNames, monitor?: MonitorSchema) => {
    if (monitor) {
      setCurrMonitor(monitor);
    }
    setDrawerName(drawerName);
    setIsDrawerOpen(true);
  };

  const handleCloseMonitor = useCallback(() => {
    setCurrMonitor(undefined);
    setIsDrawerOpen(false);
  }, []);

  const { mutateAsync: DeleteMonitorById, isLoading: isDeleteMonitorLoading } =
    useDeleteMonitorApiV1MonitorsMonitorIdDelete();

  const handleOpenDeleteMonitorDialog = (monitor: MonitorSchema) => {
    setCurrMonitor(monitor);
    setIsDeleteMonitorDialogOpen(true);
  };

  const handleDeleteMonitor = async (confirm: boolean) => {
    if (!currMonitor) return;
    if (!confirm) return setIsDeleteMonitorDialogOpen(false);

    mixpanel.track('Click on confirm deletion of monitor');

    window.scrollTo(0, 0);

    setIsDeleteMonitorDialogOpen(false);
    await DeleteMonitorById({ monitorId: currMonitor.id });
    setCurrMonitor(undefined);
    refreshMonitors();
  };

  const isLoading = !monitors || isDeleteMonitorLoading;

  return (
    <>
      <DashboardHeader onOpen={handleOpenMonitorDrawer} />
      {isLoading ? (
        <Loader />
      ) : (
        <Grid container spacing={4}>
          <Grid item md={4}>
            <ModelList activeModelId={currentModelId} models={models} filterMonitors={setCurrentModelId} />
          </Grid>
          <Grid item md={8}>
            <DataIngestion modelId={currentModelId} />
          </Grid>
          {!chartDataList.length ? (
            <Loader sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          ) : (
            chartDataList.map((chartData, index) => {
              const modelId = monitors[index].check.model_id;

              if (typeof currentModelId === 'number' && modelId !== currentModelId) {
                return null;
              }

              const toggle = prevModelId === modelId;
              prevModelId = modelId;

              if (!toggle) {
                isBlack = !isBlack;
              }

              return (
                <Grid item md={6} lg={6} xl={4} key={index}>
                  <GraphicsSection
                    data={chartData as any}
                    isBlack={isBlack}
                    monitor={monitors[index]}
                    onOpen={handleOpenMonitorDrawer}
                    onDelete={handleOpenDeleteMonitorDialog}
                    models={models}
                  />
                </Grid>
              );
            })
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
            ModalProps={{ onClose: handleCloseMonitor}}
          />
        </Grid>
      )}
    </>
  );
};
