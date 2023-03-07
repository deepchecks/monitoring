import React, { ReactNode } from 'react';

import { DialogProps } from '@mui/material';

import { MUIBaseButton } from 'components/base/Button/MUIBaseButton';

import { Row16Gap, RowAutoGap } from '../../Container/Container.styles';
import { StyledDialog, StyledDialogCloseIconButton } from './ActionDialog.styles';
import { StyledH2 } from 'components/base/Text/Header.styles';

import { CloseIcon } from 'assets/icon/icon';

export interface ActionDialogProps extends DialogProps {
  open: boolean;
  closeDialog: () => void;
  title: string;
  submitButtonLabel: string;
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
    submitButtonDisabled = false,
    submitButtonAlertType = false,
    children,
    ...otherProps
  } = props;

  return (
    <StyledDialog open={open} onClose={closeDialog} {...otherProps}>
      <RowAutoGap>
        <StyledH2>{title}</StyledH2>
        <StyledDialogCloseIconButton onClick={closeDialog}>
          <CloseIcon />
        </StyledDialogCloseIconButton>
      </RowAutoGap>
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
          Cancel
        </MUIBaseButton>
      </Row16Gap>
    </StyledDialog>
  );
};

export default ActionDialog;
