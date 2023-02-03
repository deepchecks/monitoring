import React from 'react';

import { StyledContainer, StyledHeading, StyledButton } from './MonitorListHeader.style';

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
      <StyledButton onClick={handleClick}>
        <NativePlus width={16} height={16} />
      </StyledButton>
    </StyledContainer>
  );
};
