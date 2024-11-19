import React, { useState } from 'react';
import { ChartData } from 'chart.js';

import {
  Frequency,
  MonitorSchema,
  CheckSchema,
  MonitorCheckConf,
  MonitorCheckConfSchema,
  useGetCheckInfoApiV1ChecksCheckIdInfoGet
} from 'api/generated';

import { BoxProps, Stack } from '@mui/material';

import DiagramLine from 'components/DiagramLine/DiagramLine';
import { Loader } from 'components/base/Loader/Loader';
import { RootMenu } from './components/RootMenu';
import { MonitorInfoWidget } from './components/MonitorInfoWidget';
import { MonitorAlertRuleWidget } from './components/MonitorAlertRuleWidget';

import { StyledContainer, StyledText } from './GraphicsSection.style';

import { DialogNames } from 'components/Dashboard/Dashboard.types';
import { constants } from 'components/Dashboard/dashboard.constants';
import { GraphData } from 'helpers/types';
import { FrequencyMap } from 'helpers/utils/frequency';

interface GraphicsSectionProps extends BoxProps {
  data: ChartData<'line', GraphData>;
  monitor: MonitorSchema;
  onOpenMonitorDrawer: (drawerName: DialogNames, monitor?: MonitorSchema) => void;
  onDeleteMonitor: (monitor: MonitorSchema) => void;
  isLoading?: boolean;
  onPointClick: (
    datasetName: string,
    versionName: string,
    timeLabel: number,
    additional_kwargs: MonitorCheckConfSchema | undefined,
    checkInfo: MonitorCheckConf | undefined,
    check: CheckSchema
  ) => void;
}

export function GraphicsSection({
  data,
  monitor,
  onOpenMonitorDrawer,
  onDeleteMonitor,
  isLoading,
  onPointClick,
  ...props
}: GraphicsSectionProps) {
  const { alert_rules, frequency, check, additional_kwargs } = monitor;

  const { data: checkInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(check.id, {
    query: {
      enabled: false
    }
  });

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

  const handleOpenMonitor = (drawerName: DialogNames) => {
    onOpenMonitorDrawer(drawerName, monitor);
    setAnchorElRootMenu(null);
  };

  const handleOpenDeleteMonitor = () => {
    onDeleteMonitor(monitor);
    setAnchorElRootMenu(null);
  };

  const handlePointClick = (datasetName: string, versionName: string, timeLabel: number) => {
    onPointClick(datasetName, versionName, timeLabel, additional_kwargs, checkInfo, check);
  };

  return (
    <>
      <StyledContainer onMouseOver={onMouseOver} onMouseLeave={onMouseLeave} {...props}>
        {isLoading ? (
          <Loader />
        ) : (
          <Stack direction="column">
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
              onPointCLick={handlePointClick}
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
