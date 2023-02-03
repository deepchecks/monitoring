import React, { useState } from 'react';
import { ChartData } from 'chart.js';
import mixpanel from 'mixpanel-browser';

import { MonitorSchema } from 'api/generated';

import { BoxProps } from '@mui/material';

import DiagramLine from 'components/DiagramLine/DiagramLine';
import { Loader } from 'components/Loader';
import { RootMenu } from './components/RootMenu';
import { MonitorInfoWidget } from './components/MonitorInfoWidget';

import { StyledContainer } from './GraphicsSection.style';

import { GraphData } from 'helpers/types';
import { DrawerNames } from 'components/Dashboard/Dashboard.types';

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
  const [anchorElRootMenu, setAnchorElRootMenu] = useState<HTMLElement | null>(null);

  const openRootMenu = Boolean(anchorElRootMenu);

  const onMouseOver = () => setHover(true);

  const onMouseLeave = () => setHover(false);

  const handleOpenRootMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorElRootMenu(event.currentTarget);
  };

  const handleCloseRootMenu = () => {
    setAnchorElRootMenu(null);
  };

  const handleOpenMonitor = (drawerName: DrawerNames) => {
    if (drawerName === DrawerNames.EditMonitor) {
      mixpanel.track('Click on Edit monitor');
    }

    onOpenMonitorDrawer(drawerName, monitor);
    setAnchorElRootMenu(null);
  };

  const handleOpenDeleteMonitor = () => {
    mixpanel.track('Click on Delete monitor');

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
            />
            <DiagramLine
              data={data}
              alert_rules={monitor.alert_rules}
              height={{ lg: 215, xl: 290 }}
              minTimeUnit={monitor.frequency < 86400 ? 'hour' : 'day'}
              timeFreq={monitor.frequency}
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
