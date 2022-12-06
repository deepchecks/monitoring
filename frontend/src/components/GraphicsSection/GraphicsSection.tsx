import React, { useMemo, useRef, useState } from 'react';
import { ChartData, TooltipCallbacks, TooltipItem, TooltipModel } from 'chart.js';
import { _DeepPartialObject } from 'chart.js/types/utils';
import dayjs from 'dayjs';
import mixpanel from 'mixpanel-browser';

import { GetModelsApiV1ModelsGetQueryResult, MonitorSchema } from 'api/generated';

import { Box, IconButton, Typography } from '@mui/material';

import DiagramLine from 'components/DiagramLine/DiagramLine';

import { MenuVertical } from '../../assets/icon/icon';

import {
  StyledDiagramWrapper,
  StyledDivider,
  StyledFlexContent,
  StyledFlexWrapper,
  StyledInfo,
  StyledMenuItem,
  StyledRootMenu,
  StyledTypographyTitle
} from './GraphicsSection.style';

import { DrawerNames, DrawerNamesMap } from 'components/MonitorDrawer/MonitorDrawer.types';

interface GraphicsSectionProps {
  data: ChartData<'line', { x: string; y: number }[]>;
  isBlack: boolean;
  monitor: MonitorSchema;
  onOpen: (drawerName: DrawerNames, monitor?: MonitorSchema) => void;
  onDelete: (monitor: MonitorSchema) => void;
  models: GetModelsApiV1ModelsGetQueryResult;
}

interface MonitorInfo {
  label: string;
  text: string | undefined;
}

const filterMap: { [key: string]: string } = {
  greater_than_equals: '>',
  greater_than: '>',
  equals: '=',
  contains: 'contains'
};

function GraphicsSectionComponent({ data, monitor, onOpen, models, onDelete }: GraphicsSectionProps) {
  const [hover, setHover] = useState<boolean>(false);
  const [anchorElRootMenu, setAnchorElRootMenu] = useState<null | HTMLElement>(null);
  const [openSubmenu, setOpenSubmenu] = useState<boolean>(false);
  const infoRef = useRef<HTMLDivElement>(null);

  const openRootMenu = Boolean(anchorElRootMenu);

  const modelName = useMemo(() => {
    let name;
    models.forEach(model => {
      if (model.id === monitor?.check?.model_id) {
        name = model.name;
      }
    });

    return name;
  }, [models, monitor?.check?.model_id]);

  const onMouseOver = () => setHover(true);

  const onMouseLeave = () => setHover(false);

  const handleOpenRootMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setOpenSubmenu(false);
    setAnchorElRootMenu(event.currentTarget);
  };

  const handleCloseRootMenu = () => {
    setAnchorElRootMenu(null);
  };

  const handleOpenSubmenu = () => {
    setOpenSubmenu(true);
  };

  const handleOpenMonitor = (drawerName: DrawerNames) => () => {
    if (drawerName === DrawerNamesMap.EditMonitor) {
      mixpanel.track('Click on Edit monitor');
    }

    onOpen(drawerName, monitor);
    setAnchorElRootMenu(null);
  };

  const handleOpenDeleteMonitor = () => {
    mixpanel.track('Click on Delete monitor');

    onDelete(monitor);
    setAnchorElRootMenu(null);
  };


  const monitorInfo = useMemo(() => {
    const currentMonitorInfo: MonitorInfo[] = [
      { label: 'Model', text: modelName },
      { label: 'Check', text: monitor.check.name }
    ];

    if (monitor.data_filters) {
      currentMonitorInfo.push({
        label: 'Filter',
        text: `${monitor.data_filters.filters[0].column} ${filterMap[monitor.data_filters.filters[0].operator]} ${
          monitor.data_filters.filters[0].value
        }`
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
      </StyledFlexContent>
      <StyledRootMenu
        anchorEl={anchorElRootMenu}
        open={openRootMenu}
        onClose={handleCloseRootMenu}
        MenuListProps={{
          'aria-labelledby': 'basic-button'
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <StyledMenuItem onClick={handleOpenMonitor(DrawerNamesMap.CreateAlert)}>
          <Typography variant="body2">Create alert</Typography>
        </StyledMenuItem>
        <StyledMenuItem onClick={handleOpenMonitor(DrawerNamesMap.EditMonitor)}>
          <Typography variant="body2">Edit Monitor</Typography>
        </StyledMenuItem>
        <StyledMenuItem onClick={handleOpenDeleteMonitor}>
          <Typography variant="body2">Delete Monitor</Typography>
        </StyledMenuItem>
      </StyledRootMenu>
    </>
  );
}

export const GraphicsSection = GraphicsSectionComponent;
