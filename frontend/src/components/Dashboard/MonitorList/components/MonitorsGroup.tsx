import React from 'react';
import dayjs from 'dayjs';

import { ModelManagmentSchema, MonitorSchema } from 'api/generated';

import { Box, Typography, styled, Stack, Grid } from '@mui/material';

import { Monitor } from './Monitor';

import { SetStateType } from 'helpers/types';
import { DrawerNames } from 'components/Dashboard/Dashboard.types';
import { theme } from 'theme';

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
    <StyledContainer>
      <StyledHeadingContainer>
        <StyledModelName>{model.name}</StyledModelName>
        <StyledModelLatestTime>
          (last data update:{' '}
          <StyledModelDate component="span">
            {model.latest_time ? dayjs.unix(model.latest_time).format('MMM DD, YYYY') : '-'}
          </StyledModelDate>
          )
        </StyledModelLatestTime>
        <StyledLine />
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

const StyledModelName = styled(Typography)({
  fontWeight: 600,
  fontSize: '16px',
  lineHeight: '19px',
  marginRight: '8px'
});

const StyledTypography = styled(Typography)({
  color: theme.palette.text.disabled
});

const StyledModelLatestTime = styled(StyledTypography)({
  fontWeight: 400,
  fontSize: '12px',
  lineHeight: '15px'
});

const StyledLine = styled(Box)({
  flex: 1,
  marginLeft: '24px',
  borderTop: `solid 1px ${theme.palette.grey.light}`
});

const StyledModelDate = styled(Box)({
  display: 'inline-block',
  fontWeight: 600,
  fontSize: '12px',
  lineHeight: '15px'
});
