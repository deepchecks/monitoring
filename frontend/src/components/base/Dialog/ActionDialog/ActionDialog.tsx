import React, { ReactNode } from 'react';
import { Button } from '@mui/material';

import { Row16Gap } from '../../Container/Container.styles';
import { StyledDialog } from './ActionDialog.styles';
import { WhiteGrayButton } from 'components/base/Button/Button.styles';
import { StyledH2 } from 'components/base/Text/Header.styles';

export interface ActionDialogProps {
  open: boolean;
  closeDialog: () => void;
  title: string;
  submitButtonLabel: string;
  submitButtonAction: () => void;
  children?: ReactNode | ReactNode[];
}

const ActionDialog = (props: ActionDialogProps) => {
  const { open, closeDialog, title, submitButtonAction, submitButtonLabel, children } = props;

  return (
    <StyledDialog open={open}>
      <Row16Gap>
        <StyledH2>{title}</StyledH2>
        <WhiteGrayButton onClick={() => closeDialog()} margin="0 0 0 auto" fontSize="1.5rem">
          X
        </WhiteGrayButton>
      </Row16Gap>
      {children}
      <Row16Gap>
        <Button onClick={() => submitButtonAction()}>{submitButtonLabel}</Button>
        <WhiteGrayButton onClick={() => closeDialog()}>Cancel</WhiteGrayButton>
      </Row16Gap>
    </StyledDialog>
  );
};

export default ActionDialog;
