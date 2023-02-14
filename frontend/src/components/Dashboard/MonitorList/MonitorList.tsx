import React, { useState, useEffect, useMemo } from 'react';

import { MonitorSchema, useDeleteMonitorApiV1MonitorsMonitorIdDelete, DashboardSchema } from 'api/generated';
import useModels from 'hooks/useModels';

import { Loader } from 'components/Loader';
import { MonitorsGroup } from './components/MonitorsGroup';

import { DeleteMonitor } from './components/DeleteMonitor';

import { DrawerNames } from '../Dashboard.types';
import { SetStateType } from 'helpers/types';
import { events, reportEvent } from 'helpers/mixPanel';

interface MonitorsListProps {
  dashboard: DashboardSchema | undefined;
  currentModelId: number | null;
  currentMonitor: MonitorSchema | null;
  setCurrentMonitor: SetStateType<MonitorSchema | null>;
  handleOpenMonitorDrawer: (drawerName: DrawerNames, monitor?: MonitorSchema) => void;
  monitorToRefreshId: number | null;
  setMonitorToRefreshId: SetStateType<number | null>;
  isLoading?: boolean;
}

export const MonitorList = ({
  dashboard,
  currentModelId,
  currentMonitor,
  setCurrentMonitor,
  handleOpenMonitorDrawer,
  monitorToRefreshId,
  setMonitorToRefreshId,
  isLoading
}: MonitorsListProps) => {
  const { models, getCurrentModel } = useModels();
  const { mutateAsync: DeleteMonitorById } = useDeleteMonitorApiV1MonitorsMonitorIdDelete();

  const dashboardMonitors = useMemo(
    () =>
      (dashboard?.monitors || []).sort((a, b) =>
        getCurrentModel(a.check.model_id).name.localeCompare(getCurrentModel(b.check.model_id).name)
      ),
    [dashboard?.monitors, getCurrentModel]
  );

  const [monitors, setMonitors] = useState<MonitorSchema[]>([]);
  const [isDeleteMonitorDialogOpen, setIsDeleteMonitorDialogOpen] = useState(false);

  useEffect(() => {
    const filtered = currentModelId
      ? dashboardMonitors.filter(mon => mon.check.model_id === currentModelId)
      : dashboardMonitors;
    setMonitors(filtered);
  }, [currentModelId, dashboardMonitors]);

  const handleDeleteMonitor = async (confirm: boolean) => {
    if (!currentMonitor) return;

    if (confirm) {
      reportEvent(events.clickedConfirmDeletion);

      await DeleteMonitorById({ monitorId: currentMonitor.id });

      const filtered = monitors.filter(mon => mon.id !== currentMonitor.id);
      setMonitors(filtered);
      setCurrentMonitor(null);
    }

    setIsDeleteMonitorDialogOpen(false);
  };

  return (
    <>
      {isLoading ? (
        <Loader sx={{ height: 'calc(100vh - 685px)' }} />
      ) : (
        models.map(model => (
          <MonitorsGroup
            key={model.id}
            model={model}
            monitors={monitors.filter(mon => mon.check.model_id === model.id)}
            handleOpenMonitorDrawer={handleOpenMonitorDrawer}
            monitorToRefreshId={monitorToRefreshId}
            setMonitorToRefreshId={setMonitorToRefreshId}
            setCurrentMonitor={setCurrentMonitor}
            setIsDeleteMonitorDialogOpen={setIsDeleteMonitorDialogOpen}
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
    </>
  );
};
