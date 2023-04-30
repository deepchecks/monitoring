import React, { useState } from 'react';
import { ChartData } from 'chart.js';

import { Frequency, MonitorSchema } from 'api/generated';

import { BoxProps, Stack } from '@mui/material';

import DiagramLine from 'components/DiagramLine/DiagramLine';
import { Loader } from 'components/Loader';
import { RootMenu } from './components/RootMenu';
import { MonitorInfoWidget } from './components/MonitorInfoWidget';
import { MonitorAlertRuleWidget } from './components/MonitorAlertRuleWidget';

import { StyledContainer, StyledText } from './GraphicsSection.style';

import { GraphData } from 'helpers/types';
import { DrawerNames } from 'components/Dashboard/Dashboard.types';
import { events, reportEvent } from 'helpers/services/mixPanel';
import { FrequencyMap } from 'helpers/utils/frequency';

import { constants } from 'components/Dashboard/dashboard.constants';

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
  const { alert_rules, frequency } = monitor;

  const [hover, setHover] = useState(false);
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [anchorElRootMenu, setAnchorElRootMenu] = useState<HTMLElement | null>(null);

  const minTimeUnit = monitor.frequency === Frequency['HOUR'] ? 'hour' : 'day';

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
      <StyledContainer onMouseOver={onMouseOver} onMouseLeave={onMouseLeave} {...props} sx={{ background: 'white' }}>
        {isLoading ? (
          <Loader />
        ) : (
          <Stack direction="column" height="100%">
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
              alert_rules={alert_rules}
              height={{ lg: 203, xl: 215 }}
              minTimeUnit={minTimeUnit}
              timeFreq={FrequencyMap[frequency]}
              zoomEnabled={zoomEnabled}
            />
            {alert_rules.length > 0 ? (
              <MonitorAlertRuleWidget monitor={monitor} alertRules={alert_rules} />
            ) : (
              <StyledText>{constants.noAlertText}</StyledText>
            )}
          </Stack>
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
