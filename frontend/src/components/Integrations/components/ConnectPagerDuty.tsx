import React from 'react';

import { Box, Stack } from '@mui/material';

import { StyledButton, StyledImage, StyledText } from 'components/lib';

import pagerDuty from '../../../assets/integrations/pager-duty.svg';

const ConnectPagerDuty = () => {
  return (
    <Box
      sx={{
        background: '#048A24',
        borderRadius: '10px',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)',
        position: 'relative',
        overflow: 'hidden',
        height: '170px'
      }}
    >
      <Box maxWidth={620}>
        <Stack spacing="16px" pt="10px">
          <StyledText text="Get notified on Pager Duty" type="h1" color="white" />
          <StyledText
            text="Get DeepChecks alerts and communications via pagerDuty integration."
            type="h3"
            color="white"
          />
        </Stack>
        <StyledButton onClick={() => ''} label="Uninstall" margin="24px 0 0" />
      </Box>
      <StyledImage alt="pagerDuty" src={pagerDuty} width="100px" height="100px" margin="24px 0" />
    </Box>
  );
};

export default ConnectPagerDuty;
