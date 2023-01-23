import React from 'react';
import mixpanel from 'mixpanel-browser';

import { useCountAlertsApiV1AlertsCountActiveGet } from 'api/generated';

import { Box, Stack } from '@mui/material';

import { AlertCount, SEVERITY } from 'components/AlertCount';
import { ShareButton } from 'components/ShareButton';

import {
  StyledContainer,
  StyledHeading,
  StyledContentContainer,
  StyledDivider,
  StyledButton
} from './DashboardHeader.style';
import { PlusIcon } from 'assets/icon/icon';
import { colors } from 'theme/colors';

import { DrawerNames } from '../Dashboard.types';

interface DashboardHeaderProps {
  onOpen: (monitorName: DrawerNames) => void;
}

export const DashboardHeader = ({ onOpen }: DashboardHeaderProps) => {
  const { data } = useCountAlertsApiV1AlertsCountActiveGet();

  const handleClick = () => {
    mixpanel.track('Click on Add monitor');
    onOpen(DrawerNames.CreateMonitor);
  };

  return (
    <>
      <StyledContainer>
        <StyledHeading variant="h2">Dashboard</StyledHeading>
        <StyledContentContainer>
          <Stack spacing="20px" alignItems="center" direction="row">
            <AlertCount count={data?.critical ? data.critical : 0} severity={SEVERITY.CRITICAL} />
            <AlertCount count={data?.high ? data.high : 0} severity={SEVERITY.HIGH} />
          </Stack>
          <StyledDivider />
          <ShareButton />
          <Box onClick={handleClick} sx={{marginLeft: '1em'}}>
            <StyledButton variant="text" startIcon={<PlusIcon fill={colors.primary.violet[400]} />}>
              Add Monitor
            </StyledButton>
          </Box>
        </StyledContentContainer>
      </StyledContainer>
    </>
  );
};
