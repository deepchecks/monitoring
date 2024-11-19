import React, { ReactNode } from 'react';

import { Dialog, DialogProps } from '../Dialog';
import { Text } from '../../Text/Text';

interface DeletionDialogProps extends DialogProps {
  messageStart?: string;
  itemToDelete?: string | number;
  messageEnd?: string;
  loading?: boolean;
  children?: ReactNode | ReactNode[];
}

export const DeletionDialog = ({
  messageStart,
  messageEnd,
  itemToDelete,
  loading,
  children,
  ...otherProps
}: DeletionDialogProps) => {
  return (
    <Dialog alertTypeButtons {...otherProps} isLoading={loading}>
      <Text
        textAlign="center"
        type="h3"
        text={
          <>
            {messageStart} <strong>{itemToDelete}</strong> {messageEnd}
          </>
        }
      />
      {children}
    </Dialog>
  );
};
