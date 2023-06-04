import React from 'react';

import { StyledText, StyledContainer } from 'components/lib';

import { getStorageItem, storageKeys } from 'helpers/utils/localStorage';

const constants = {
  adminError: 'Billing is unavailable for your user role, please contact your organization owner.',
  cloudError: 'Billing is unavailable on open source, please contact us.'
};

const NotOwnerMsg = () => {
  const { is_cloud } = getStorageItem(storageKeys.environment);

  const errMessage = is_cloud ? constants.adminError : constants.cloudError;

  return (
    <StyledContainer>
      <StyledText text={errMessage} type="h2" color="red" margin="10vh auto" />
    </StyledContainer>
  );
};

export default NotOwnerMsg;
