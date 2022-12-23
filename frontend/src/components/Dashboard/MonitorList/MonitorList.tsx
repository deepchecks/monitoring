import React, { useState, useEffect, useMemo } from 'react';
import mixpanel from 'mixpanel-browser';

import {
  MonitorSchema,
  useGetOrCreateDashboardApiV1DashboardsGet,
  useDeleteMonitorApiV1MonitorsMonitorIdDelete
} from 'api/generated';
import useModels from 'hooks/useModels';

import { Grid, GridProps } from '@mui/material';

import { Loader } from 'components/Loader';
import { Monitor } from './components/Monitor';
import { DeleteMonitor } from './components/DeleteMonitor';

import { DrawerNames } from '../MonitorDrawer/MonitorDrawer.types';
import { SetStateType } from 'helpers/types';

interface MonitorsListProps extends GridProps {
  currentModelId: number | null;
  currentMonitor: MonitorSchema | null;
  setCurrentMonitor: SetStateType<MonitorSchema | null>;
  handleOpenMonitorDrawer: (drawerName: DrawerNames, monitor?: MonitorSchema) => void;
  monitorToRefreshId: number | null;
  setMonitorToRefreshId: SetStateType<number | null>;
}

export const MonitorList = ({
  currentModelId,
  currentMonitor,
  setCurrentMonitor,
  handleOpenMonitorDrawer,
  monitorToRefreshId,
  setMonitorToRefreshId,
  ...props
}: MonitorsListProps) => {
  const { getCurrentModel } = useModels();
  const { data: dashboard, isLoading } = useGetOrCreateDashboardApiV1DashboardsGet({
    query: {
      refetchOnWindowFocus: false
    }
  });
  const { mutateAsync: DeleteMonitorById } = useDeleteMonitorApiV1MonitorsMonitorIdDelete();

  const dashboardMonitors = useMemo(
    () =>
      (dashboard?.monitors || []).sort((a, b) =>
        getCurrentModel(a.check.model_id).name.localeCompare(getCurrentModel(b.check.model_id).name)
      ),
    [dashboard, getCurrentModel]
  );

  const [monitors, setMonitors] = useState(dashboardMonitors);
  const [isDeleteMonitorDialogOpen, setIsDeleteMonitorDialogOpen] = useState(false);

  useEffect(() => {
    setMonitors(dashboardMonitors);
  }, [dashboardMonitors]);

  const handleDeleteMonitor = async (confirm: boolean) => {
    if (!currentMonitor) return;

    if (confirm) {
      mixpanel.track('Click on confirm deletion of monitor');

      await DeleteMonitorById({ monitorId: currentMonitor.id });

      const filtered = monitors.filter(mon => mon.id !== currentMonitor.id);
      setMonitors(filtered);
      setCurrentMonitor(null);
    }

    setIsDeleteMonitorDialogOpen(false);
  };

  return (
    <Grid container spacing={4} marginBottom="32px" {...props}>
      {isLoading ? (
        <Loader sx={{ height: 'calc(100vh - 685px)' }} />
      ) : (
        monitors.map(mon => (
          <Monitor
            key={mon.id}
            initialMonitor={mon}
            hidden={currentModelId ? mon.check.model_id !== currentModelId : false}
            setCurrentMonitor={setCurrentMonitor}
            setIsDeleteMonitorDialogOpen={setIsDeleteMonitorDialogOpen}
            handleOpenMonitorDrawer={handleOpenMonitorDrawer}
            monitorToRefreshId={monitorToRefreshId}
            setMonitorToRefreshId={setMonitorToRefreshId}
          />
        ))
      )}
      {currentMonitor && (
        <DeleteMonitor
          monitor={currentMonitor}
          open={isDeleteMonitorDialogOpen}
          setIsOpen={setIsDeleteMonitorDialogOpen}
          onActionButtonClick={handleDeleteMonitor}
        />
      )}
    </Grid>
  );
};
