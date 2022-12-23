import React from 'react';

import { MonitorSchema } from 'api/generated';

import { Dialog, IconButton, Stack, DialogProps } from '@mui/material';

import { StyledContainer, StyledHeading, StyledText, StyledActionButton } from './DeleteMonitor.style';
import { CloseIcon } from 'assets/icon/icon';

interface DeleteMonitorProps extends DialogProps {
  monitor?: MonitorSchema;
  setIsOpen: (isOpen: boolean) => void;
  onActionButtonClick: (confirm: boolean) => void;
}

export const DeleteMonitor = ({ monitor, onActionButtonClick, setIsOpen, ...props }: DeleteMonitorProps) => (
  <Dialog onClose={() => setIsOpen(false)} {...props}>
    <StyledContainer>
      <Stack direction="row">
        <StyledHeading variant="h4">Delete Monitor</StyledHeading>
        <IconButton onClick={() => setIsOpen(false)} sx={{ backgroundColor: 'transparent' }}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <Stack>
        <StyledText variant="body1">
          You are about to permanently delete {monitor?.name}, this will also delete any alerts connected to this
          monitor. Are you sure you want to continue?
        </StyledText>
      </Stack>
      <Stack direction="row" justifyContent="flex-end">
        <StyledActionButton onClick={() => onActionButtonClick(false)} variant="outlined">
          NO, CANCEL
        </StyledActionButton>
        <StyledActionButton onClick={() => onActionButtonClick(true)} variant="contained">
          YES, CONTINUE
        </StyledActionButton>
      </Stack>
    </StyledContainer>
  </Dialog>
);
