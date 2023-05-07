import React from 'react';

import { StyledButton, StyledContainer, StyledText } from 'components/lib';

import { NativePlus } from 'assets/icon/icon';

import { DrawerNames } from '../Dashboard.types';

interface MonitorListHeaderProps {
  onClick: (monitorName: DrawerNames) => void;
}

export const MonitorListHeader = ({ onClick }: MonitorListHeaderProps) => {
  const handleClick = () => onClick(DrawerNames.CreateMonitor);

  return (
    <StyledContainer width="100%" flexDirection="row" justifyContent="space-between" alignItems="center">
      <StyledText text="Monitors" type="h2" />
      <StyledButton onClick={handleClick} label="Add monitor" startIcon={<NativePlus />} width="170px" />
    </StyledContainer>
  );
};
