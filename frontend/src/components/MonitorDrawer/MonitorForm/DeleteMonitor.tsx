import React from 'react';

import { Button, ButtonProps, Dialog, IconButton, Stack, Typography } from '@mui/material';

import { CloseIcon } from 'assets/icon/icon';

import { DeleteMonitorProps } from './MonitorForm.types';

const DeleteMonitor = ({ isOpen, monitor, onClick, setIsOpen }: DeleteMonitorProps) => (
  <Dialog open={isOpen}>
    <Stack sx={{ width: '500px', p: '19px 18px 30px 30px' }}>
      <Stack direction="row">
        <Typography variant="h4" fontWeight={700} sx={{ flexGrow: 1 }}>
          Delete Monitor
        </Typography>
        <IconButton onClick={() => setIsOpen(false)} sx={{ backgroundColor: 'transparent' }}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <Stack>
        <Typography variant="body1" sx={{ maxWidth: '423px', p: '36.5px 0 61.5px' }}>
          You are about to permanently delete {monitor?.name}, this will also delete any alerts connected to this
          monitor. Are you sure you want to continue?
        </Typography>
      </Stack>
      <Stack direction="row" justifyContent="flex-end">
        <ActionButton onClick={() => onClick(false)} variant="outlined" text="NO, CANCEL" />
        <ActionButton onClick={() => onClick(true)} variant="contained" text="YES, CONTINUE" />
      </Stack>
    </Stack>
  </Dialog>
);

const ActionButton = ({
  text,
  variant,
  onClick
}: {
  text: string;
  variant?: ButtonProps['variant'];
  onClick: () => void;
}) => (
  <Button
    variant={variant}
    onClick={onClick}
    sx={{
      ':first-of-type': {
        mr: '20px'
      },
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: '22px',
      letterSpacing: '1px',
      p: '0 14px'
    }}
  >
    {text}
  </Button>
);

export default DeleteMonitor;
