import React from 'react';

import { MenuProps, Typography, styled } from '@mui/material';

import { StyledMenuItem, StyledRootMenu } from '../GraphicsSection.style';

import { Bell, Edit, Trash } from 'assets/icon/icon';

import { DrawerNames } from 'components/Dashboard/Dashboard.types';

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
    <StyledMenuItem onClick={() => handleOpenMonitor(DrawerNames.CreateAlert)}>
      <Bell />
      <StyledTypography>Create alert</StyledTypography>
    </StyledMenuItem>
    <StyledMenuItem onClick={() => handleOpenMonitor(DrawerNames.EditMonitor)}>
      <Edit />
      <StyledTypography>Edit monitor</StyledTypography>
    </StyledMenuItem>
    <StyledMenuItem onClick={handleOpenDeleteMonitor}>
      <Trash />
      <StyledTypography sx={{ color: '#E7696A' }}>Delete monitor</StyledTypography>
    </StyledMenuItem>
  </StyledRootMenu>
);

const StyledTypography = styled(Typography)({
  fontWeight: 500,
  fontSize: '14px',
  lineHeight: '18px',
  marginLeft: '14px'
});
