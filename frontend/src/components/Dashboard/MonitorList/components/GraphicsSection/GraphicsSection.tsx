import React, { useMemo, useRef, useState } from 'react';
import { ChartData } from 'chart.js';
import mixpanel from 'mixpanel-browser';

import { MonitorSchema, OperatorsEnum } from 'api/generated';

import { Box, BoxProps, IconButton, Typography } from '@mui/material';

import DiagramLine from 'components/DiagramLine/DiagramLine';
import { Loader } from 'components/Loader';

import { MenuVertical } from 'assets/icon/icon';

import {
  StyledDiagramWrapper,
  StyledDivider,
  StyledFlexContent,
  StyledFlexWrapper,
  StyledInfo,
  StyledTypographyTitle
} from './GraphicsSection.style';

import { GraphData } from 'helpers/types';
import { DrawerNames } from 'components/Dashboard/Dashboard.types';
import { RootMenu } from './RootMenu';

interface GraphicsSectionProps extends BoxProps {
  data: ChartData<'line', GraphData>;
  monitor: MonitorSchema;
  onOpenMonitorDrawer: (drawerName: DrawerNames, monitor?: MonitorSchema) => void;
  onDeleteMonitor: (monitor: MonitorSchema) => void;
  modelName: string;
  isLoading?: boolean;
}

interface MonitorInfo {
  label: string;
  text: string | undefined;
}

function GraphicsSectionComponent({
  data,
  monitor,
  onOpenMonitorDrawer,
  modelName,
  onDeleteMonitor,
  isLoading
}: GraphicsSectionProps) {
  const [hover, setHover] = useState(false);
  const [anchorElRootMenu, setAnchorElRootMenu] = useState<HTMLElement | null>(null);

  const infoRef = useRef<HTMLDivElement>(null);
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

  const monitorInfo = useMemo(() => {
    const currentMonitorInfo: MonitorInfo[] = [
      { label: 'Model', text: modelName },
      { label: 'Check', text: monitor.check.name }
    ];

    const filters = monitor?.data_filters?.filters;

    if (filters?.length) {
      const text =
        filters.length > 1
          ? `${filters[0].value} < ${filters[0].column} < ${filters[1].value}`
          : `${filters[0].column} ${OperatorsEnum[filters[0].operator]} ${filters[0].value}`;

      currentMonitorInfo.push({
        label: 'Filter',
        text
      });
    }

    const initLength = currentMonitorInfo.length;

    if (infoRef.current && modelName) {
      const monitorInfoWidth = (infoRef.current.clientWidth - 40) * 2;
      let fullWidth = 0;

      const monitorInfoOptions = infoRef.current.children;

      for (let i = 0; i < monitorInfoOptions.length; i++) {
        const firstEmptySpaceCondition =
          fullWidth < monitorInfoWidth / 2 && fullWidth + monitorInfoOptions[i].clientWidth > monitorInfoWidth / 2;
        const secondEmptySpaceCondition =
          fullWidth < monitorInfoWidth && fullWidth + monitorInfoOptions[i].clientWidth > monitorInfoWidth;

        if (firstEmptySpaceCondition) {
          fullWidth = monitorInfoWidth / 2;
        }

        if (secondEmptySpaceCondition) {
          fullWidth = monitorInfoWidth;
        }

        fullWidth += monitorInfoOptions[i].clientWidth;
      }

      while (currentMonitorInfo.length !== monitorInfoOptions.length && !currentMonitorInfo.length) {
        currentMonitorInfo.pop();
      }

      for (let i = monitorInfoOptions.length - 1; i > 0; i--) {
        if (fullWidth > monitorInfoWidth) {
          fullWidth -= monitorInfoOptions[i].clientWidth;
          currentMonitorInfo.pop();
          continue;
        }

        const last = currentMonitorInfo.length - 1;
        if (last && initLength !== currentMonitorInfo.length) {
          currentMonitorInfo[last].text = `${currentMonitorInfo[last]?.text?.slice(0, -3)}...`;
        }

        return currentMonitorInfo;
      }
    }

    return currentMonitorInfo;
  }, [monitor, modelName]);

  return (
    <>
      <StyledFlexContent onMouseOver={onMouseOver} onMouseLeave={onMouseLeave}>
        {isLoading ? (
          <Loader />
        ) : (
          <>
            <StyledFlexWrapper>
              <StyledTypographyTitle>{monitor.name}</StyledTypographyTitle>
              {(hover || openRootMenu) && (
                <IconButton onClick={handleOpenRootMenu} size="small">
                  <MenuVertical />
                </IconButton>
              )}
            </StyledFlexWrapper>
            <StyledInfo ref={infoRef}>
              {monitorInfo.map((item, index) => {
                if (!item) {
                  return null;
                }

                const { label, text } = item;

                return (
                  <Box sx={{ display: 'flex' }} key={index}>
                    <Typography variant="subtitle2" sx={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {label}: {text}
                    </Typography>
                    {monitorInfo.length - 1 !== index && <StyledDivider orientation="vertical" flexItem />}
                  </Box>
                );
              })}
            </StyledInfo>
            <StyledDiagramWrapper>
              <DiagramLine
                data={data}
                alert_rules={monitor.alert_rules}
                height={320}
                minTimeUnit={monitor.frequency < 86400 ? 'hour' : 'day'}
                timeFreq={monitor.frequency}
              />
            </StyledDiagramWrapper>
          </>
        )}
      </StyledFlexContent>
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

export const GraphicsSection = GraphicsSectionComponent;
