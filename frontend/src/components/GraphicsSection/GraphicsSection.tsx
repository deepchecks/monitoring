import React, { memo, useState, useMemo, useEffect } from 'react';
import { IconButton, Stack, Typography } from '@mui/material';
import { ChartData } from 'chart.js';
import { MenuVertical } from '../../assets/icon/icon.js';
import DiagramLine from '../DiagramLine';
import { Submenu } from '../Submenu';
import { ID } from '../../helpers/types';
import {
  StyledArrow,
  StyledDiagramWrapper,
  StyledFlexContent,
  StyledFlexWrapper,
  StyledMenuItem,
  StyledRootMenu,
  StyledTypographyTitle,
  StyledDivider,
  StyledInfo
} from './GraphicsSection.style';
import { GetModelsApiV1ModelsGetQueryResult, MonitorSchema } from 'api/generated.js';

interface GraphicsSectionProps {
  data: ChartData<'line', { x: string; y: number }[]>;
  monitor: MonitorSchema;
  onOpen: (id: ID) => void;
  title: string;
  models: GetModelsApiV1ModelsGetQueryResult;
}

function GraphicsSectionComponent({ data, monitor, onOpen, models }: GraphicsSectionProps) {
  const [hover, setHover] = useState<boolean>(false);
  const [anchorElRootMenu, setAnchorElRootMenu] = useState<null | HTMLElement>(null);
  const [openSubmenu, setOpenSubmenu] = useState<boolean>(false);

  const openRootMenu = Boolean(anchorElRootMenu);

  const modelName = useMemo(() => {
    let name;
    models.forEach(model => {
      if (model.id === monitor.check.model_id) {
        name = model.name;
      }
    });

    return name;
  }, [models, monitor.check.model_id]);

  useEffect(() => {
    setHover(true);
    setTimeout(() => setHover(false), 1000);
  }, [monitor]);

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

  const handleOpenEditMonitor = () => {
    onOpen(monitor.id);
    setAnchorElRootMenu(null);
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
          <Typography variant="subtitle2">Model: {modelName}</Typography>
          <StyledDivider orientation="vertical" flexItem />
          <Typography variant="subtitle2">Check: {monitor.check.name}</Typography>
        </StyledInfo>
        <StyledDiagramWrapper>
          <DiagramLine data={data} />
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
        <StyledMenuItem onClick={handleOpenEditMonitor}>
          <Typography variant="body2">Edit</Typography>
        </StyledMenuItem>
        <StyledMenuItem onClick={handleOpenSubmenu}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" width={1}>
            <Typography variant="body2">Change width</Typography>
            <StyledArrow fill="black" />
          </Stack>
          <Submenu open={openSubmenu}>
            <StyledMenuItem onClick={handleCloseRootMenu}>
              <Typography variant="body2">One Columns</Typography>
            </StyledMenuItem>
            <StyledMenuItem onClick={handleCloseRootMenu}>
              <Typography variant="body2">TwoColumns</Typography>
            </StyledMenuItem>
            <StyledMenuItem onClick={handleCloseRootMenu}>
              <Typography variant="body2">ThreeColumns</Typography>
            </StyledMenuItem>
          </Submenu>
        </StyledMenuItem>
      </StyledRootMenu>
    </>
  );
}

export const GraphicsSection = GraphicsSectionComponent;
