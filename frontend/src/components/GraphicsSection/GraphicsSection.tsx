import { IconButton, Stack, Typography } from '@mui/material';
import { GetModelsApiV1ModelsGetQueryResult, MonitorSchema } from 'api/generated.js';
import { ChartData, TooltipCallbacks, TooltipItem, TooltipModel } from 'chart.js';
import { _DeepPartialObject } from 'chart.js/types/utils.js';
import { DrawerNames, DrawerNamesMap } from 'components/MonitorDrawer/MonitorDrawer';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { MenuVertical } from '../../assets/icon/icon';
import DiagramLine from '../DiagramLine';
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

interface GraphicsSectionProps {
  data: ChartData<'line', { x: string; y: number }[]>;
  isBlack: boolean;
  monitor: MonitorSchema;
  onOpen: (drawerName: DrawerNames, monitor?: MonitorSchema) => void;
  onDelete: (monitor: MonitorSchema) => void;
  models: GetModelsApiV1ModelsGetQueryResult;
}

function GraphicsSectionComponent({ data, isBlack, monitor, onOpen, models, onDelete }: GraphicsSectionProps) {
  const [hover, setHover] = useState<boolean>(false);
  const [anchorElRootMenu, setAnchorElRootMenu] = useState<null | HTMLElement>(null);
  const [openSubmenu, setOpenSubmenu] = useState<boolean>(false);

  const openRootMenu = Boolean(anchorElRootMenu);

  const filterMap: { [key: string]: string } = {
    greater_than: '>',
    equals: '=',
    contains: 'contains'
  };

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
    onOpen(drawerName, monitor);
    setAnchorElRootMenu(null);
  };

  const handleOpenDeleteMonitor = () => {
    onDelete(monitor);
    setAnchorElRootMenu(null);
  };

  function getTime(timeLabel: string) {
    if (monitor.frequency < 86400) return dayjs(timeLabel).format('MMM. DD YYYY hha');
    return dayjs(timeLabel).format('MMM. DD YYYY');
  }

  const tooltipCallbacks: _DeepPartialObject<TooltipCallbacks<'line', TooltipModel<'line'>, TooltipItem<'line'>>> = {
    label: (context: TooltipItem<'line'>) =>
      `${getTime(context.label)} | Model Version ${context.dataset.label?.split(':')[0]}`
  };
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
        <StyledInfo>
          <Stack direction="row">
            <Typography variant="subtitle2">Model:</Typography>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: theme => (isBlack ? theme.palette.grey[300] : theme.palette.text.primary),
                ml: '4px'
              }}
            >
              {modelName}
            </Typography>
          </Stack>

          <StyledDivider orientation="vertical" flexItem />
          <Stack direction="row">
            <Typography variant="subtitle2">Check:</Typography>
            <Typography variant="subtitle2" ml="4px">
              {monitor.check.name}
            </Typography>
          </Stack>

          {monitor.data_filters ? (
            <>
              <StyledDivider orientation="vertical" flexItem />
              <Typography variant="subtitle2">
                <>
                  Filter: {monitor.data_filters.filters[0].column}{' '}
                  {filterMap[monitor.data_filters.filters[0].operator as string]}{' '}
                  {monitor.data_filters.filters[0].value}
                </>
              </Typography>
            </>
          ) : (
            ''
          )}
        </StyledInfo>
        <StyledDiagramWrapper>
          <DiagramLine data={data} tooltipCallbacks={tooltipCallbacks} alert_rules={monitor.alert_rules} />
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
