import React from 'react';

import { Dialog, DialogProps } from '../Dialog';
import { Text } from '../../Text/Text';

interface DeletionDialogProps extends DialogProps {
  messageStart?: string;
  itemToDelete?: string | number;
  messageEnd?: string;
}

export const DeletionDialog = ({ messageStart, messageEnd, itemToDelete, ...otherProps }: DeletionDialogProps) => {
  return (
    <Dialog alertTypeButtons {...otherProps}>
      <Text
        textAlign="center"
        type="h3"
        text={
          <p>
            {messageStart} <strong>{itemToDelete}</strong> {messageEnd}
          </p>
        }
      />
    </Dialog>
  );
};
