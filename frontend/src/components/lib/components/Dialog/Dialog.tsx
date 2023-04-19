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
  submitButtonAlertType?: boolean;
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
    cancelButtonLabel = 'Cancel',
    submitButtonDisabled,
    submitButtonAlertType,
    children,
    ...otherProps
  } = props;

  return (
    <MUIDialog open={open} onClose={closeDialog} {...otherProps}>
      <DialogContent sx={{ padding: '8px 12px', minWidth: '600px' }}>
        <Container flexDirection="row" justifyContent="space-between">
          <Text text={title} variant="h1" />
          <CloseIcon onClick={closeDialog} color="primary" fontSize="large" sx={{ cursor: 'pointer' }} />
        </Container>
        <Container textAlign="center">{children}</Container>
        <Container gap="24px" flexDirection="row">
          <Button
            label={submitButtonLabel}
            onClick={submitButtonAction}
            disabled={submitButtonDisabled}
            color={submitButtonAlertType ? 'error' : 'primary'}
          />
          <Button label={cancelButtonLabel} onClick={closeDialog} color="info" />
        </Container>
      </DialogContent>
    </MUIDialog>
  );
};
