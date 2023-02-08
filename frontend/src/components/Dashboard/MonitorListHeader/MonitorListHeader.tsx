import React from 'react';

import { StyledContainer, StyledHeading, StyledButton, StyledLine } from './MonitorListHeader.style';

import { NativePlus } from 'assets/icon/icon';

interface MonitorListHeaderProps {
  onClick: (monitorName: DrawerNames) => void;
}

import { DrawerNames } from '../Dashboard.types';

export const MonitorListHeader = ({ onClick }: MonitorListHeaderProps) => {
  const handleClick = () => onClick(DrawerNames.CreateMonitor);

  return (
    <StyledContainer>
      <StyledHeading>Monitors</StyledHeading>
      <StyledLine />
      <StyledButton onClick={handleClick} startIcon={<NativePlus width={16} height={16} />}>
        Add monitor
      </StyledButton>
    </StyledContainer>
  );
};
