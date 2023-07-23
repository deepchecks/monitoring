import React, { ReactNode } from 'react';
import { DialogProps as MUIDialogProps } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { Container } from '../Container/Container';
import { Text } from '../Text/Text';
import { Button } from '../Button/Button';
import { DialogBase } from './DialogBase';

export interface DialogProps extends MUIDialogProps {
  open: boolean;
  closeDialog: () => void;
  title: string;
  submitButtonLabel?: string;
  submitButtonAction?: () => void;
  submitButtonDisabled?: boolean;
  submitButtonWidth?: string;
  alertTypeButtons?: boolean;
  cancelButtonAction?: () => void;
  cancelButtonLabel?: string;
  isLoading?: boolean;
  children?: ReactNode | ReactNode[];
  hideButtons?: boolean;
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
    submitButtonWidth = 'auto',
    submitButtonDisabled,
    alertTypeButtons,
    isLoading,
    children,
    hideButtons = false,
    ...otherProps
  } = props;

  const buttonColor = alertTypeButtons ? 'error' : 'primary';

  return (
    <DialogBase open={open} onClose={closeDialog} {...otherProps}>
      <Container flexDirection="row" justifyContent="space-between" padding="12px 16px">
        <Text text={title} type="h1" />
        <CloseIcon onClick={closeDialog} color={buttonColor} sx={{ cursor: 'pointer' }} />
      </Container>
      <Container paddingX="16px">{children}</Container>
      {!hideButtons && (
        <Container gap="24px" flexDirection="row" justifyContent="center">
          <Button
            label={submitButtonLabel}
            onClick={submitButtonAction}
            disabled={submitButtonDisabled}
            color={buttonColor}
            loading={isLoading}
            width={submitButtonWidth}
          />
          <Button
            label={cancelButtonLabel}
            onClick={cancelButtonAction || closeDialog}
            variant="outlined"
            color={buttonColor}
          />
        </Container>
      )}
    </DialogBase>
  );
};
