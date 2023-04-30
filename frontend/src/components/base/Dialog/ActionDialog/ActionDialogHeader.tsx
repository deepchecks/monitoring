import React from 'react';

import { RowAutoGap } from '../../Container/Container.styles';
import { StyledH2 } from '../../Text/Header.styles';
import { StyledDialogCloseIconButton } from './ActionDialog.styles';

import { CloseIcon } from 'assets/icon/icon';

interface ActionDialogHeaderProps {
  title: string;
  onClose: () => void;
}

export const ActionDialogHeader = ({ title, onClose }: ActionDialogHeaderProps) => (
  <RowAutoGap>
    <StyledH2>{title}</StyledH2>
    <StyledDialogCloseIconButton onClick={onClose}>
      <CloseIcon />
    </StyledDialogCloseIconButton>
  </RowAutoGap>
);
