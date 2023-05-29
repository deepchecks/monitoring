import React from 'react';
import { useNavigate } from 'react-router-dom';

import ActionDialog from 'components/base/Dialog/ActionDialog/ActionDialog';

import { BillingText } from '../Billing/Billing.styles';

const constants = {
  notAdminTitle: 'Access Forbidden',
  notAdminBtnLabel: 'Return',
  notAdminText: 'Your user does not have admin rights,\n please contact your admin to get permissions'
};

const NotAdminDialog = () => {
  const navigate = useNavigate();

  return (
    <ActionDialog
      open={true}
      title={constants.notAdminTitle}
      submitButtonAction={() => navigate('/')}
      submitButtonLabel={constants.notAdminBtnLabel}
      closeDialog={() => navigate('/')}
    >
      <BillingText weight={'700'} color={'red'} margin={'44px'}>
        {constants.notAdminText}
      </BillingText>
    </ActionDialog>
  );
};

export default NotAdminDialog;
