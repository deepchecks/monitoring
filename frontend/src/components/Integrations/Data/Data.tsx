import React, { useState } from 'react';
import { Box } from '@mui/material';

import { useGetDataSourcesApiV1DataSourcesGet } from 'api/generated';

import { StyledButton, StyledContainer, StyledImage, StyledText, StyledToolTip } from 'components/lib';
import S3Dialog from './components/S3Dialog';

import useUser from 'helpers/hooks/useUser';
import { getStorageItem, storageKeys } from 'helpers/utils/localStorage';

import s3Img from '../../../assets/integrations/s3.svg';

import { constants } from '../integrations.constants';

const { ossErrMsg, adminErrMsg, tableNameColumn, s3, connect, tableStatusColumn } = constants.data;

const isCloud = getStorageItem(storageKeys.environment)['is_cloud'];

const Data = () => {
  const [openS3Dialog, setOpenS3Dialog] = useState(false);
  const { data, refetch } = useGetDataSourcesApiV1DataSourcesGet();
  const { isAdmin } = useUser();

  const isS3Connected = data && data.length > 0;
  const toolTipText = !isCloud ? ossErrMsg : !isAdmin && !isS3Connected ? adminErrMsg : connect;

  const handleOpenS3Dialog = () => setOpenS3Dialog(true);
  const handleCloseS3Dialog = () => setOpenS3Dialog(false);

  return (
    <>
      <StyledContainer flexDirection="row" justifyContent="space-between" marginBottom="12px">
        <StyledText type="bodyBold" text={tableNameColumn} />
        <StyledText type="bodyBold" text={tableStatusColumn} marginRight="40%" />
      </StyledContainer>
      <StyledContainer flexDirection="row" justifyContent="space-between" type="card">
        <StyledContainer flexDirection="row">
          <StyledImage src={s3Img} height="24px" width="24px" />
          <StyledText type="h3" text={s3.name} fontWeight={700} marginTop="2px" />
        </StyledContainer>
        <StyledToolTip text={toolTipText} placement="top" arrow>
          <Box width="100px" marginRight="calc(40% - 20px)" padding="8px">
            <StyledButton
              label={s3.status(!!isS3Connected)}
              onClick={handleOpenS3Dialog}
              variant="outlined"
              sx={{
                border: 'none',
                color: isS3Connected ? 'green' : 'primary',
                pointerEvents: isS3Connected || !isAdmin || !isCloud ? 'none' : 'auto',

                '&:hover': { border: 'none' }
              }}
            />
          </Box>
        </StyledToolTip>
      </StyledContainer>
      <S3Dialog open={openS3Dialog} handleClose={handleCloseS3Dialog} refetch={refetch} />
    </>
  );
};

export default Data;
