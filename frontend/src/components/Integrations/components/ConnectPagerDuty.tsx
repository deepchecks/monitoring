import React from 'react';

import { Box, Stack } from '@mui/material';

import { StyledButton, StyledImage, StyledText } from 'components/lib';

import pagerDuty from '../../../assets/integrations/pager-duty.svg';

import { constants } from '../integrations.constants';

const ConnectPagerDuty = () => {
  return (
    <Box
      sx={{
        background: '#048A24',
        borderRadius: '10px',
        padding: '0 24px',
        display: 'flex',
        width: '100%',
        maxWidth: '500px',
        height: '170px'
      }}
    >
      <Box>
        <Stack spacing="16px" pt="10px" marginBottom="20px">
          <StyledText text={constants.connect.pagerDuty.title} type="h1" color="white" />
          <StyledText text={constants.connect.pagerDuty.description} type="h3" color="white" />
        </Stack>
        <StyledButton onClick={() => ''} label="Connect" color="inherit" />
      </Box>
      <StyledImage alt="pagerDuty" src={pagerDuty} width="100px" height="100px" margin="auto" />
    </Box>
  );
};

export default ConnectPagerDuty;
