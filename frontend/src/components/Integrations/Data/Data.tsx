import React, { useState } from 'react';
import { Box, Tooltip } from '@mui/material';

import { useGetDataSourcesApiV1DataSourcesGet } from 'api/generated';

import { StyledButton, StyledContainer, StyledImage, StyledText } from 'components/lib';
import S3Dialog from './components/S3Dialog';

import useUser from 'helpers/hooks/useUser';

import { constants } from '../integrations.constants';

import s3 from '../../../assets/integrations/s3.svg';

const Data = () => {
  const [openS3Dialog, setOpenS3Dialog] = useState(false);
  const { data, refetch } = useGetDataSourcesApiV1DataSourcesGet();
  const { isAdmin } = useUser();

  const isS3Connected = data && data.length > 0;

  const handleOpenS3Dialog = () => setOpenS3Dialog(true);
  const handleCloseS3Dialog = () => setOpenS3Dialog(false);

  return (
    <>
      <StyledContainer flexDirection="row" justifyContent="space-between" marginBottom="12px">
        <StyledText type="bodyBold" text={constants.data.tableNameColumn} />
        <StyledText type="bodyBold" text={constants.data.tableStatusColumn} marginRight="40%" />
      </StyledContainer>
      <StyledContainer flexDirection="row" justifyContent="space-between" type="card">
        <StyledContainer flexDirection="row">
          <StyledImage src={s3} height="24px" width="24px" />
          <StyledText type="h3" text={constants.data.s3.name} fontWeight={700} />
        </StyledContainer>
        <Tooltip title={!isAdmin && !isS3Connected ? constants.data.adminErrMsg : ''}>
          <Box width="100px" marginRight="39%" padding="8px">
            <StyledButton
              label={constants.data.s3.status(!!isS3Connected)}
              onClick={handleOpenS3Dialog}
              variant="outlined"
              sx={{
                border: 'none',
                color: isS3Connected ? 'green' : 'primary',
                pointerEvents: isS3Connected || !isAdmin ? 'none' : 'auto',

                '&:hover': { border: 'none' }
              }}
            />
          </Box>
        </Tooltip>
      </StyledContainer>
      <S3Dialog open={openS3Dialog} handleClose={handleCloseS3Dialog} refetch={refetch} />
    </>
  );
};

export default Data;
