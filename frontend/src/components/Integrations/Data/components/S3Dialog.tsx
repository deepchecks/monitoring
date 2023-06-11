import React, { useState } from 'react';

import { StyledContainer, StyledDialog, StyledInput, StyledText } from 'components/lib';
import { SelectPrimary, SelectPrimaryItem } from 'components/Select/SelectPrimary';

import { newDataSourceApiV1DataSourcesPut } from 'api/generated';
import { resError } from 'helpers/types/resError';

import { s3RegionsList } from '../helpers/s3RegionsList';

interface S3DialogProps {
  open: boolean;
  handleClose: () => void;
  refetch: () => void;
}

const S3Dialog = ({ open, handleClose, refetch }: S3DialogProps) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
      setIsLoading(true);
      setError('');

      const res = await newDataSourceApiV1DataSourcesPut(payload);

      if ((res as unknown as resError).error_message) {
        setError((res as resError).error_message);
        setIsLoading(false);
      } else {
        refetch();
        setIsLoading(false);
        setError('');
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
      submitButtonWidth="110px"
      isLoading={isLoading}
    >
      <StyledContainer flexDirection="column" gap="16px">
        <StyledInput
          label="Access Key ID"
          placeholder="Enter Access Key ID"
          value={accessKeyID}
          onChange={e => setAccessKeyID(e.target.value)}
          onCloseIconClick={() => setAccessKeyID('')}
          sx={{ height: '50px' }}
        />
        <StyledInput
          label="Secret Access Key"
          placeholder="Enter Secret Access Key"
          value={secretKey}
          onChange={e => setSecretKey(e.target.value)}
          onCloseIconClick={() => setSecretKey('')}
          sx={{ height: '50px', margin: '0 0 16px' }}
        />
        <SelectPrimary label="Region" onChange={e => setRegion(e.target.value as string)} value={region}>
          {s3RegionsList.map(({ value, label }) => (
            <SelectPrimaryItem value={value} key={value}>
              {label}
            </SelectPrimaryItem>
          ))}
        </SelectPrimary>
      </StyledContainer>
      <StyledText text={error} color="red" />
    </StyledDialog>
  );
};

export default S3Dialog;
