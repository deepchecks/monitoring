import React, { useState, useEffect, useMemo } from 'react';

import {
  MonitorSchema,
  useDeleteMonitorApiV1MonitorsMonitorIdDelete,
  DashboardSchema,
  CheckSchema,
  MonitorCheckConf,
  MonitorCheckConfSchema,
  ModelManagmentSchema
} from 'api/generated';

import { Loader } from 'components/base/Loader/Loader';
import { MonitorsGroup } from './components/MonitorsGroup';
import { DeleteMonitor } from './components/DeleteMonitor';

import useModels from 'helpers/hooks/useModels';
import { DialogNames } from '../Dashboard.types';
import { SetStateType } from 'helpers/types';

interface MonitorsListProps {
  dashboard: DashboardSchema | undefined;
  currentModelId: number | null;
  currentMonitor: MonitorSchema | null;
  setCurrentMonitor: SetStateType<MonitorSchema | null>;
  handleOpenMonitorDialog: (drawerName: DialogNames, monitor?: MonitorSchema) => void;
  monitorToRefreshId: number | null;
  setMonitorToRefreshId: SetStateType<number | null>;
  isLoading?: boolean;
  setCurrentModel: React.Dispatch<React.SetStateAction<ModelManagmentSchema>>;
  onPointClick: (
    datasetName: string,
    versionName: string,
    timeLabel: number,
    additionalKwargs: MonitorCheckConfSchema | undefined,
    checkInfo: MonitorCheckConf | undefined,
    check: CheckSchema,
    currentModel: ModelManagmentSchema
  ) => void;
}

export const MonitorList = ({
  dashboard,
  currentModelId,
  currentMonitor,
  setCurrentMonitor,
  handleOpenMonitorDialog,
  monitorToRefreshId,
  setMonitorToRefreshId,
  isLoading,
  onPointClick,
  setCurrentModel
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
    if (dashboardMonitors.length) {
      const filtered = currentModelId
        ? dashboardMonitors.filter(mon => mon.check.model_id === currentModelId)
        : dashboardMonitors;
      setMonitors(filtered);
    }
  }, [currentModelId, dashboardMonitors]);

  const handleDeleteMonitor = async () => {
    if (!currentMonitor) return;

    await DeleteMonitorById({ monitorId: currentMonitor.id });

    setMonitors(monitors.filter(mon => mon.id !== currentMonitor.id));
    setCurrentMonitor(null);
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
            handleOpenMonitorDialog={handleOpenMonitorDialog}
            monitorToRefreshId={monitorToRefreshId}
            setMonitorToRefreshId={setMonitorToRefreshId}
            setCurrentMonitor={setCurrentMonitor}
            setIsDeleteMonitorDialogOpen={setIsDeleteMonitorDialogOpen}
            onPointClick={onPointClick}
            setCurrentModel={setCurrentModel}
          />
        ))
      )}
      {currentMonitor && (
        <DeleteMonitor
          monitor={currentMonitor}
          open={isDeleteMonitorDialogOpen}
          setIsOpen={setIsDeleteMonitorDialogOpen}
          deleteMonitor={handleDeleteMonitor}
        />
      )}
    </>
  );
};
