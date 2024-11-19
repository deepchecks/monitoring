import React from 'react';

import { DialogProps, Dialog, DialogContent } from '@mui/material';

export const DialogBase = (props: DialogProps) => {
  const { open, children, sx, ...otherProps } = props;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && otherProps?.onClose) {
      otherProps?.onClose(event, 'escapeKeyDown');
    }
  };

  return (
    <Dialog
      open={open}
      onKeyDown={handleKeyDown}
      sx={{ '.MuiDialog-paper': { borderRadius: '16px' }, ...sx }}
      {...otherProps}
    >
      <DialogContent sx={{ padding: '16px 14px', minWidth: '550px' }}>{children}</DialogContent>
    </Dialog>
  );
};
