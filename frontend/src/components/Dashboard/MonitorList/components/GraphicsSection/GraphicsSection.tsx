import React, { useState } from 'react';
import { ChartData } from 'chart.js';

import { MonitorSchema } from 'api/generated';

import { BoxProps } from '@mui/material';

import DiagramLine from 'components/DiagramLine/DiagramLine';
import { Loader } from 'components/Loader';
import { RootMenu } from './components/RootMenu';
import { MonitorInfoWidget } from './components/MonitorInfoWidget';

import { StyledContainer } from './GraphicsSection.style';

import { GraphData } from 'helpers/types';
import { DrawerNames } from 'components/Dashboard/Dashboard.types';
import { events, reportEvent } from 'helpers/services/mixPanel';

interface GraphicsSectionProps extends BoxProps {
  data: ChartData<'line', GraphData>;
  monitor: MonitorSchema;
  onOpenMonitorDrawer: (drawerName: DrawerNames, monitor?: MonitorSchema) => void;
  onDeleteMonitor: (monitor: MonitorSchema) => void;
  isLoading?: boolean;
}

export function GraphicsSection({
  data,
  monitor,
  onOpenMonitorDrawer,
  onDeleteMonitor,
  isLoading,
  ...props
}: GraphicsSectionProps) {
  const [hover, setHover] = useState(false);
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [anchorElRootMenu, setAnchorElRootMenu] = useState<HTMLElement | null>(null);

  const openRootMenu = Boolean(anchorElRootMenu);

  const onMouseOver = () => setHover(true);

  const onMouseLeave = () => !zoomEnabled && setHover(false);

  const handleOpenRootMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorElRootMenu(event.currentTarget);
  };

  const handleCloseRootMenu = () => {
    setAnchorElRootMenu(null);
  };

  const handleOpenMonitor = (drawerName: DrawerNames) => {
    if (drawerName === DrawerNames.EditMonitor) {
      reportEvent(events.dashboardPage.clickedEditMonitor);
    }

    onOpenMonitorDrawer(drawerName, monitor);
    setAnchorElRootMenu(null);
  };

  const handleOpenDeleteMonitor = () => {
    reportEvent(events.dashboardPage.clickedDeleteMonitor);

    onDeleteMonitor(monitor);
    setAnchorElRootMenu(null);
  };

  return (
    <>
      <StyledContainer onMouseOver={onMouseOver} onMouseLeave={onMouseLeave} {...props}>
        {isLoading ? (
          <Loader />
        ) : (
          <>
            <MonitorInfoWidget
              monitor={monitor}
              hover={hover}
              openRootMenu={openRootMenu}
              handleOpenRootMenu={handleOpenRootMenu}
              zoomEnabled={zoomEnabled}
              setZoomEnabled={setZoomEnabled}
            />
            <DiagramLine
              data={data}
              alert_rules={monitor.alert_rules}
              height={{ lg: 203, xl: 215 }}
              minTimeUnit={monitor.frequency < 86400 ? 'hour' : 'day'}
              timeFreq={monitor.frequency}
              zoomEnabled={zoomEnabled}
            />
          </>
        )}
      </StyledContainer>
      <RootMenu
        anchorEl={anchorElRootMenu}
        open={openRootMenu}
        onClose={handleCloseRootMenu}
        handleOpenMonitor={handleOpenMonitor}
        handleOpenDeleteMonitor={handleOpenDeleteMonitor}
      />
    </>
  );
}
