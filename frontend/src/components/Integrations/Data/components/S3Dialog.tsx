import React, { useState } from 'react';

import { StyledContainer, StyledDialog, StyledInput, StyledText } from 'components/lib';
import { newDataSourceApiV1DataSourcesPut } from 'api/generated';
import { resError } from 'helpers/types/resError';

interface S3DialogProps {
  open: boolean;
  handleClose: () => void;
  refetch: () => void;
}

const S3Dialog = ({ open, handleClose, refetch }: S3DialogProps) => {
  const [error, setError] = useState('');
  const [accessKeyID, setAccessKeyID] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [region, setRegion] = useState('');

  const payload = {
    type: 's3',
    parameters: { aws_access_key_id: accessKeyID, aws_secret_access_key: secretKey, region: region }
  };

  const handleSubmitS3Form = async () => {
    if (!accessKeyID || !secretKey || !region) {
      setError('Please fill all the require fields');
    } else {
      const res = await newDataSourceApiV1DataSourcesPut(payload);

      if ((res as unknown as resError).error_message) {
        setError((res as resError).error_message);
      } else {
        refetch();
        handleClose();
      }
    }
  };

  return (
    <StyledDialog
      open={open}
      title="Integrate AWS S3"
      closeDialog={handleClose}
      submitButtonLabel="Integrate"
      submitButtonAction={handleSubmitS3Form}
    >
      <StyledContainer flexDirection="column" gap="16px">
        <StyledInput
          label="Access Key ID"
          placeholder="Enter Access Key ID"
          value={accessKeyID}
          onChange={e => setAccessKeyID(e.target.value)}
          onCloseIconClick={() => setAccessKeyID('')}
        />
        <StyledInput
          label="Secret Access Key"
          placeholder="Enter Secret Access Key"
          value={secretKey}
          onChange={e => setSecretKey(e.target.value)}
          onCloseIconClick={() => setSecretKey('')}
        />
        <StyledInput
          label="Region"
          placeholder="Enter Region"
          value={region}
          onChange={e => setRegion(e.target.value)}
          onCloseIconClick={() => setRegion('')}
        />
      </StyledContainer>
      <StyledText text={error} color="red" />
    </StyledDialog>
  );
};

export default S3Dialog;
