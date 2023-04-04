import React, { forwardRef } from 'react';
import { Alert as MuiAlert, AlertProps, Snackbar, SnackbarProps } from '@mui/material';

type AlertsSnackbarProps = SnackbarProps & AlertProps;

const Alert = forwardRef<HTMLDivElement, AlertProps>(({ children, ...props }, ref) => (
  <MuiAlert elevation={6} ref={ref} variant="filled" {...props}>
    {children}
  </MuiAlert>
));

Alert.displayName = 'Alert';

export const AlertsSnackbar = ({ children, severity, ...props }: AlertsSnackbarProps) => (
  <Snackbar {...props}>
    <Alert severity={severity}>{children}</Alert>
  </Snackbar>
);
