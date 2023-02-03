import React from 'react';
import dayjs from 'dayjs';

import { ModelManagmentSchema, MonitorSchema } from 'api/generated';

import { Box, Typography, styled, Stack, Grid } from '@mui/material';

import { Monitor } from './Monitor';

import { colors } from 'theme/colors';

import { SetStateType } from 'helpers/types';
import { DrawerNames } from 'components/Dashboard/Dashboard.types';

interface MonitorsGroupProps {
  model: ModelManagmentSchema;
  monitors: MonitorSchema[];
  setCurrentMonitor: SetStateType<MonitorSchema | null>;
  handleOpenMonitorDrawer: (drawerName: DrawerNames, monitor?: MonitorSchema) => void;
  monitorToRefreshId: number | null;
  setMonitorToRefreshId: SetStateType<number | null>;
  setIsDeleteMonitorDialogOpen: SetStateType<boolean>;
}

export const MonitorsGroup = ({
  model,
  monitors,
  setCurrentMonitor,
  handleOpenMonitorDrawer,
  monitorToRefreshId,
  setMonitorToRefreshId,
  setIsDeleteMonitorDialogOpen
}: MonitorsGroupProps) => {
  if (!monitors.length) return <></>;

  return (
    <StyledContainer key={model.id}>
      <StyledHeadingContainer>
        <StyledModelName>{model.name}</StyledModelName>
        <StyledModelLatestTime>
          (last data update:{' '}
          <StyledModelDate>
            {model.latest_time ? dayjs.unix(model.latest_time).format('MMM DD, YYYY') : '-'}
          </StyledModelDate>
          )
        </StyledModelLatestTime>
      </StyledHeadingContainer>
      <Grid container spacing={{ xs: 2.5, lg: 2.5, xl: 4 }}>
        {monitors.map(mon => (
          <Monitor
            key={mon.id}
            initialMonitor={mon}
            setCurrentMonitor={setCurrentMonitor}
            setIsDeleteMonitorDialogOpen={setIsDeleteMonitorDialogOpen}
            handleOpenMonitorDrawer={handleOpenMonitorDrawer}
            monitorToRefreshId={monitorToRefreshId}
            setMonitorToRefreshId={setMonitorToRefreshId}
          />
        ))}
      </Grid>
    </StyledContainer>
  );
};

const StyledContainer = styled(Box)({
  marginBottom: '20px',

  ':last-of-type': {
    marginBottom: 0
  }
});

const StyledHeadingContainer = styled(Stack)({
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: '20px'
});

const StyledTypography = styled(Typography)({
  color: colors.neutral.lightText
});

const StyledModelName = styled(StyledTypography)({
  fontWeight: 600,
  fontSize: '16px',
  lineHeight: '19px',
  marginRight: '8px'
});

const StyledModelLatestTime = styled(StyledTypography)({
  fontWeight: 400,
  fontSize: '12px',
  lineHeight: '15px'
});

const StyledModelDate = styled(StyledTypography)({
  display: 'inline-block',
  fontWeight: 600,
  fontSize: '12px',
  lineHeight: '15px'
});
