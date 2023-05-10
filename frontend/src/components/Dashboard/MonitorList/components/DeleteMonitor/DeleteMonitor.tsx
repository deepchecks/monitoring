import React from 'react';

import { MonitorSchema } from 'api/generated';

import { StyledDeletionDialog } from 'components/lib';

import { constants } from '../../../dashboard.constants';

const { cancel, messageEnd, messageStart, name, submit, title } = constants.monitorList.deleteMonitor;

interface DeleteMonitorProps {
  open: boolean;
  monitor?: MonitorSchema;
  setIsOpen: (isOpen: boolean) => void;
  deleteMonitor: () => Promise<void>;
}

export const DeleteMonitor = ({ monitor, deleteMonitor, setIsOpen, open }: DeleteMonitorProps) => {
  const handleClose = () => setIsOpen(false);

  const handleSubmit = () => {
    deleteMonitor();
    handleClose();
  };

  return (
    <StyledDeletionDialog
      open={open}
      title={title}
      closeDialog={handleClose}
      submitButtonLabel={submit}
      submitButtonAction={handleSubmit}
      cancelButtonLabel={cancel}
      messageStart={messageStart}
      itemToDelete={name(monitor?.name)}
      messageEnd={messageEnd}
    />
  );
};
