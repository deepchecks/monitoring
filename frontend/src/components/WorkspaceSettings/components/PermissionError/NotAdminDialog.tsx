import React from 'react';
import { useNavigate } from 'react-router-dom';

import { DeletionDialog } from 'components/lib/components/Dialog/DeletionDialog/DeletionDialog';

const constants = {
  notAdminTitle: 'Access Forbidden',
  notAdminBtnLabel: 'Return',
  notAdminText: 'Your user does not have admin rights,\n please contact your admin to get permissions'
};

const NotAdminDialog = () => {
  const navigate = useNavigate();

  return (
    <DeletionDialog
      open={true}
      title={constants.notAdminTitle}
      submitButtonAction={() => navigate('/')}
      submitButtonLabel={constants.notAdminBtnLabel}
      closeDialog={() => navigate('/')}
      messageStart={constants.notAdminText}
    />
  );
};

export default NotAdminDialog;
