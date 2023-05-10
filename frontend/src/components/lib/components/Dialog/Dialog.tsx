import React, { ReactNode } from 'react';
import { DialogProps as MUIDialogProps, Dialog as MUIDialog, DialogContent } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { Container } from '../Container/Container';
import { Text } from '../Text/Text';
import { Button } from '../Button/Button';

export interface DialogProps extends MUIDialogProps {
  open: boolean;
  closeDialog: () => void;
  title: string;
  submitButtonLabel: string;
  submitButtonAction: () => void;
  submitButtonDisabled?: boolean;
  alertTypeButtons?: boolean;
  cancelButtonAction?: () => void;
  cancelButtonLabel?: string;
  children?: ReactNode | ReactNode[];
}

export const Dialog = (props: DialogProps) => {
  const {
    open,
    closeDialog,
    title,
    submitButtonAction,
    submitButtonLabel,
    cancelButtonAction,
    cancelButtonLabel = 'Cancel',
    submitButtonDisabled,
    alertTypeButtons,
    children,
    ...otherProps
  } = props;

  const buttonColor = alertTypeButtons ? 'error' : 'primary';

  return (
    <MUIDialog open={open} onClose={closeDialog} {...otherProps} sx={{ '.MuiDialog-paper': { borderRadius: '16px' } }}>
      <DialogContent sx={{ padding: '16px 14px', minWidth: '600px' }}>
        <Container flexDirection="row" justifyContent="space-between" padding="12px 16px">
          <Text text={title} type="h1" />
          <CloseIcon onClick={closeDialog} color="primary" sx={{ cursor: 'pointer' }} />
        </Container>
        <Container textAlign="center">{children}</Container>
        <Container gap="24px" flexDirection="row" justifyContent="center">
          <Button
            label={submitButtonLabel}
            onClick={submitButtonAction}
            disabled={submitButtonDisabled}
            color={buttonColor}
          />
          <Button
            label={cancelButtonLabel}
            onClick={cancelButtonAction || closeDialog}
            variant="outlined"
            color={buttonColor}
          />
        </Container>
      </DialogContent>
    </MUIDialog>
  );
};
