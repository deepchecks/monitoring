import React from 'react';

import { Box, Stack } from '@mui/material';

import { ConnectSlack } from '../components/Integrations/ConnectSlack';
import HeaderLayout from 'components/HeaderLayout';

import { featuresList, PermissionControlWrapper } from 'helpers/permissionControl';

import { StyledH3 } from 'components/base/Text/Header.styles';

const constants = {
  noIntegrationText: 'No integrations available at the moment'
};

export const IntegrationsPage = function () {
  return (
    <Box>
      <Stack spacing="40px">
        <HeaderLayout title="Integrations" />
        <PermissionControlWrapper
          feature={featuresList.slack_enabled}
          fallbackOption={<StyledH3>{constants.noIntegrationText}</StyledH3>}
        >
          <ConnectSlack />
        </PermissionControlWrapper>
      </Stack>
    </Box>
  );
};

export default IntegrationsPage;
