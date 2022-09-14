import React, { useState } from 'react';
import { GraphicsSection } from '../components/GraphicsSection/GraphicsSection';
import { ModelList } from '../components/ModelList';
import MonitorDrawer from '../components/MonitorDrawer/MonitorDrawer';
import { DashboardHeader } from '../components/DashboardHeader';
import { Loader } from '../components/Loader';
import { ID } from '../helpers/types/';

import { MonitorSchema, useGetModelsApiV1ModelsGet } from '../api/generated';
import { Grid } from '@mui/material';
import { DataIngestion } from 'components/DataIngestion/DataIngestion';
import useMonitorsData from '../hooks/useMonitorsData';

export const DashboardPage = () => {
  const { data: models = [] } = useGetModelsApiV1ModelsGet();
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [currMonitor, setCurrMonitor] = useState<MonitorSchema>();
  const { monitors, chartDataList } = useMonitorsData();

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

  if (!monitors) return <Loader />;

  return (
    <>
      <DashboardHeader onOpen={handleOpenMonitorDrawer} />
      <Grid container spacing={4}>
        <Grid item xs={4}>
          <ModelList models={models} />
        </Grid>
        <Grid item xs={8}>
          <DataIngestion />
        </Grid>
        {!chartDataList.length ? (
          <Loader />
        ) : (
          chartDataList.map((chartData, index) => (
            <Grid item xs={4} key={index}>
              <GraphicsSection
                data={chartData as any}
                monitor={monitors[index]}
                onOpen={handleOpenMonitorDrawer}
                models={models}
              />
            </Grid>
          ))
        )}
        <MonitorDrawer monitor={currMonitor} anchor="right" open={isDrawerOpen} onClose={handleCloseMonitor} />
      </Grid>
    </>
  );
};
