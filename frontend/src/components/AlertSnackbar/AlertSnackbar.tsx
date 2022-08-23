import {
  Alert as MuiAlert,
  AlertProps,
  Snackbar,
  SnackbarProps,
} from "@mui/material";
import { forwardRef } from "react";

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ children, ...props }, ref) => (
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props}>
      {children}
    </MuiAlert>
  )
);

type AlertSnackbarProps = SnackbarProps & AlertProps;

export function AlertSnackbar({
  children,
  severity,
  ...props
}: AlertSnackbarProps) {
  return (
    <Snackbar {...props}>
      <Alert severity={severity}>{children}</Alert>
    </Snackbar>
  );
}
