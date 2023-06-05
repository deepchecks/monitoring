import React, { useState } from 'react';
import { Box, Button } from '@mui/material';

import { StyledContainer, StyledImage, StyledText } from 'components/lib';
import S3Dialog from './components/S3Dialog';

import { constants } from '../integrations.constants';

import s3 from '../../../assets/integrations/s3.svg';

const Data = () => {
  const [openS3Dialog, setOpenS3Dialog] = useState(false);

  const isS3Connected = false;

  const handleOpenS3Dialog = () => setOpenS3Dialog(true);
  const handleCloseS3Dialog = () => setOpenS3Dialog(false);

  return (
    <Box>
      <StyledContainer flexDirection="row" justifyContent="space-between" marginBottom="12px">
        <StyledText text={constants.data.tableNameColumn} type="bodyBold" />
        <StyledText text={constants.data.tableStatusColumn} marginRight="40%" type="bodyBold" />
      </StyledContainer>
      <StyledContainer flexDirection="row" justifyContent="space-between" type="card">
        <StyledContainer flexDirection="row">
          <StyledImage src={s3} height="24px" width="24px" />
          <StyledText text={constants.data.s3.name} type="h3" fontWeight={700} />
        </StyledContainer>
        <Button sx={{ marginRight: '38%', width: '250px' }} onClick={handleOpenS3Dialog}>
          {constants.data.s3.status(isS3Connected)}
        </Button>
        <S3Dialog open={openS3Dialog} handleClose={handleCloseS3Dialog} />
      </StyledContainer>
    </Box>
  );
};

export default Data;
