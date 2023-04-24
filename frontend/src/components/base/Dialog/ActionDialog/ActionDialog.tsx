import React, { ReactNode } from 'react';

import { DialogProps } from '@mui/material';

import { MUIBaseButton } from 'components/base/Button/MUIBaseButton';

import { ActionDialogHeader } from './ActionDialogHeader';
import { Row16Gap } from '../../Container/Container.styles';
import { StyledDialog } from './ActionDialog.styles';

export interface ActionDialogProps extends DialogProps {
  open: boolean;
  closeDialog: () => void;
  title: string;
  submitButtonLabel: string;
  cancelButtonLabel?: string;
  submitButtonDisabled?: boolean;
  submitButtonAlertType?: boolean;
  submitButtonAction: () => void;
  children?: ReactNode | ReactNode[];
}

const ActionDialog = (props: ActionDialogProps) => {
  const {
    open,
    closeDialog,
    title,
    submitButtonAction,
    submitButtonLabel,
    cancelButtonLabel = 'Cancel',
    submitButtonDisabled = false,
    submitButtonAlertType = false,
    children,
    ...otherProps
  } = props;

  return (
    <StyledDialog open={open} onClose={closeDialog} {...otherProps}>
      <ActionDialogHeader title={title} onClose={closeDialog} />
      {children}
      <Row16Gap>
        <MUIBaseButton
          onClick={submitButtonAction}
          disabled={submitButtonDisabled}
          color={submitButtonAlertType ? 'error' : 'primary'}
        >
          {submitButtonLabel}
        </MUIBaseButton>
        <MUIBaseButton variant="text" sx={{ color: theme => theme.palette.text.disabled }} onClick={closeDialog}>
          {cancelButtonLabel}
        </MUIBaseButton>
      </Row16Gap>
    </StyledDialog>
  );
};

export default ActionDialog;
