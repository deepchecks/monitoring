import React from 'react';

import { MenuProps, Typography, styled } from '@mui/material';

import { StyledMenuItem, StyledRootMenu } from '../GraphicsSection.style';

import { Bell, Edit, Trash } from 'assets/icon/icon';

import { DialogNames } from 'components/Dashboard/Dashboard.types';

import { theme } from 'components/lib/theme';

interface RootMenuProps extends MenuProps {
  handleOpenMonitor: (drawerName: DialogNames) => void;
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
    <StyledRootMenuItem onClick={() => handleOpenMonitor(DialogNames.CreateAlert)}>
      <Bell />
      <StyledTypography>Create alert</StyledTypography>
    </StyledRootMenuItem>
    <StyledRootMenuItem onClick={() => handleOpenMonitor(DialogNames.EditMonitor)}>
      <Edit />
      <StyledTypography>Edit monitor</StyledTypography>
    </StyledRootMenuItem>
    <StyledMenuItem onClick={handleOpenDeleteMonitor}>
      <Trash stroke={theme.palette.error.main} />
      <StyledTypography sx={{ color: theme => theme.palette.severity.critical }}>Delete monitor</StyledTypography>
    </StyledMenuItem>
  </StyledRootMenu>
);

const StyledRootMenuItem = styled(StyledMenuItem)(({ theme }) => ({
  '& svg': {
    stroke: theme.palette.primary.main
  }
}));

const StyledTypography = styled(Typography)({
  fontWeight: 500,
  fontSize: '14px',
  lineHeight: '18px',
  marginLeft: '14px'
});
