import React from 'react';

import { MenuProps, Typography } from '@mui/material';

import { StyledMenuItem, StyledRootMenu } from './GraphicsSection.style';

import { DrawerNamesMap, DrawerNames } from 'components/Dashboard/MonitorDrawer/MonitorDrawer.types';

interface RootMenuProps extends MenuProps {
  handleOpenMonitor: (drawerName: DrawerNames) => void;
  handleOpenDeleteMonitor: () => void;
}

export const RootMenu = ({ handleOpenMonitor, handleOpenDeleteMonitor, ...props }: RootMenuProps) => (
  <StyledRootMenu
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
    {...props}
  >
    <StyledMenuItem onClick={() => handleOpenMonitor(DrawerNamesMap.CreateAlert)}>
      <Typography variant="body2">Create alert</Typography>
    </StyledMenuItem>
    <StyledMenuItem onClick={() => handleOpenMonitor(DrawerNamesMap.EditMonitor)}>
      <Typography variant="body2">Edit Monitor</Typography>
    </StyledMenuItem>
    <StyledMenuItem onClick={handleOpenDeleteMonitor}>
      <Typography variant="body2">Delete Monitor</Typography>
    </StyledMenuItem>
  </StyledRootMenu>
);
