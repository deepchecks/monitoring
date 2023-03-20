import React from 'react';

import { MonitorSchema } from 'api/generated';

import { DeleteActionDialog } from 'components/base/Dialog/ActionDialog/DeleteActionDialog';

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
    <DeleteActionDialog
      title={title}
      open={open}
      closeDialog={handleClose}
      submitButtonLabel={submit}
      cancelButtonLabel={cancel}
      submitButtonAction={handleSubmit}
      messageStart={messageStart}
      itemNameToDelete={name(monitor?.name)}
      messageEnd={messageEnd}
    />
  );
};
