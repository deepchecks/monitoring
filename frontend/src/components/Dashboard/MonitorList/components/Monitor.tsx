import React, { useMemo, useEffect, useState, memo, useCallback } from 'react';

import {
  MonitorSchema,
  runMonitorLookbackApiV1MonitorsMonitorIdRunPost,
  getMonitorApiV1MonitorsMonitorIdGet,
  CheckSchema,
  MonitorCheckConf,
  MonitorCheckConfSchema
} from 'api/generated';

import { Grid, GridProps } from '@mui/material';
import { GraphicsSection } from './GraphicsSection';

import useModels from 'helpers/hooks/useModels';
import { useElementOnScreen } from 'helpers/hooks/useElementOnScreen';
import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';
import { SetStateType } from 'helpers/types';
import { DialogNames } from '../../Dashboard.types';

interface MonitorProps extends GridProps {
  initialMonitor: MonitorSchema;
  hidden?: boolean;
  setCurrentMonitor: SetStateType<MonitorSchema | null>;
  setIsDeleteMonitorDialogOpen: SetStateType<boolean>;
  handleOpenMonitorDialog: (drawerName: DialogNames, monitor?: MonitorSchema) => void;
  monitorToRefreshId: number | null;
  setMonitorToRefreshId: SetStateType<number | null>;
  onPointClick: (
    datasetName: string,
    versionName: string,
    timeLabel: number,
    additional_kwargs: MonitorCheckConfSchema | undefined,
    checkInfo: MonitorCheckConf | undefined,
    check: CheckSchema
  ) => void;
}

const MonitorComponent = ({
  initialMonitor,
  setCurrentMonitor,
  setIsDeleteMonitorDialogOpen,
  handleOpenMonitorDialog,
  monitorToRefreshId,
  setMonitorToRefreshId,
  onPointClick,
  ...props
}: MonitorProps) => {
  const { getCurrentModel } = useModels();
  const { observedContainerRef, isVisible } = useElementOnScreen();

  const [monitor, setMonitor] = useState(initialMonitor);
  const [data, setData] = useState<ReturnType<typeof parseDataForLineChart>>({ datasets: [], labels: [] });
  const [loading, setLoading] = useState(true);

  const currentModel = useMemo(
    () => getCurrentModel(monitor.check.model_id),
    [getCurrentModel, monitor.check.model_id]
  );

  const fetchGraphicSectionData = useCallback(async () => {
    if (!currentModel?.latest_time) {
      setLoading(false);
    }

    if (typeof currentModel?.latest_time === 'number' && isVisible) {
      const graphicSectionData = await runMonitorLookbackApiV1MonitorsMonitorIdRunPost(monitor.id, {
        end_time: new Date(currentModel?.latest_time * 1000).toISOString()
      });

      setData(parseDataForLineChart(graphicSectionData));
      setLoading(false);
    }
  }, [currentModel?.latest_time, isVisible, monitor.id]);

  useEffect(() => {
    fetchGraphicSectionData();
  }, [fetchGraphicSectionData]);

  useEffect(() => {
    async function refresh() {
      if (monitorToRefreshId && monitorToRefreshId === monitor.id) {
        setLoading(true);
        setMonitorToRefreshId(null);

        const refreshedMonitor = await getMonitorApiV1MonitorsMonitorIdGet(monitor.id);
        setMonitor(refreshedMonitor);

        fetchGraphicSectionData();
      }
    }

    refresh();
  }, [fetchGraphicSectionData, monitorToRefreshId, monitor.id, setMonitorToRefreshId]);

  const openDeleteMonitorDialog = (monitor: MonitorSchema) => {
    setCurrentMonitor(monitor);
    setIsDeleteMonitorDialogOpen(true);
  };

  return (
    <Grid ref={observedContainerRef} item md={6} lg={6} xl={4} {...props} width="100%">
      <GraphicsSection
        data={data}
        monitor={monitor}
        isLoading={loading}
        onOpenMonitorDrawer={handleOpenMonitorDialog}
        onDeleteMonitor={openDeleteMonitorDialog}
        onPointClick={onPointClick}
      />
    </Grid>
  );
};

export const Monitor = memo(MonitorComponent);
