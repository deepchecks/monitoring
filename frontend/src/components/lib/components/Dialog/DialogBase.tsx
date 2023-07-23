import React from 'react';
import { DialogProps, Dialog, DialogContent } from '@mui/material';

export const DialogBase = (props: DialogProps) => {
  const { open, children, sx, ...otherProps } = props;

  return (
    <Dialog open={open} sx={{ '.MuiDialog-paper': { borderRadius: '16px' }, ...sx }} {...otherProps}>
      <DialogContent sx={{ padding: '16px 14px', minWidth: '600px' }}>{children}</DialogContent>
    </Dialog>
  );
};
