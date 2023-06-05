import React, { useState } from 'react';

import { useTheme } from '@mui/material';

import { StyledContainer, StyledDialog, StyledInput, StyledText } from 'components/lib';

// import { resError } from 'helpers/types/resError';

interface S3DialogProps {
  open: boolean;
  handleClose: () => void;
}

const S3Dialog = ({ handleClose, open }: S3DialogProps) => {
  const theme = useTheme();

  const [error, setError] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [region, setRegion] = useState('');

  const payload = {
    type: 's3',
    parameters: { access_key: accessKey, secret_key: secretKey, region: region }
  };

  const handleSubmitS3Form = () => {
    if (!accessKey || !secretKey || !region) {
      setError('Please fill all the require fields');
    } else {
      console.log(payload);
      setError('');
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
          label="Access Key"
          placeholder="Enter Access Key"
          value={accessKey}
          onChange={e => setAccessKey(e.target.value)}
          onCloseIconClick={() => setAccessKey('')}
        />
        <StyledInput
          label="Secret Key"
          placeholder="Enter Secret Key"
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
      <StyledText text={error} color={theme.palette.error.main} />
    </StyledDialog>
  );
};

export default S3Dialog;
