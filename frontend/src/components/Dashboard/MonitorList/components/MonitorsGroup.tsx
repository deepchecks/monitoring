import React from 'react';
import dayjs from 'dayjs';

import {
  ModelManagmentSchema,
  MonitorSchema,
  CheckSchema,
  MonitorCheckConf,
  MonitorCheckConfSchema
} from 'api/generated';

import { Box, Typography, styled, Stack, Grid } from '@mui/material';

import { Monitor } from './Monitor';
import { StyledContainer } from 'components/lib';

import { SetStateType } from 'helpers/types';
import { DialogNames } from 'components/Dashboard/Dashboard.types';
import { theme } from 'components/lib/theme';

interface MonitorsGroupProps {
  model: ModelManagmentSchema;
  monitors: MonitorSchema[];
  setCurrentMonitor: SetStateType<MonitorSchema | null>;
  handleOpenMonitorDialog: (drawerName: DialogNames, monitor?: MonitorSchema) => void;
  monitorToRefreshId: number | null;
  setMonitorToRefreshId: SetStateType<number | null>;
  setIsDeleteMonitorDialogOpen: SetStateType<boolean>;
  setCurrentModel: React.Dispatch<React.SetStateAction<ModelManagmentSchema>>;
  onPointClick: (
    datasetName: string,
    versionName: string,
    timeLabel: number,
    additionalKwargs: MonitorCheckConfSchema | undefined,
    checkInfo: MonitorCheckConf | undefined,
    check: CheckSchema,
    currentModel: ModelManagmentSchema
  ) => void;
}

export const MonitorsGroup = ({
  model,
  monitors,
  setCurrentMonitor,
  handleOpenMonitorDialog,
  monitorToRefreshId,
  setMonitorToRefreshId,
  setIsDeleteMonitorDialogOpen,
  onPointClick,
  setCurrentModel
}: MonitorsGroupProps) => {
  if (!monitors.length) return <></>;

  const handlePointClick = (
    datasetName: string,
    versionName: string,
    timeLabel: number,
    additional_kwargs: MonitorCheckConfSchema | undefined,
    checkInfo: MonitorCheckConf | undefined,
    check: CheckSchema
  ) => {
    setCurrentModel(model);
    onPointClick(datasetName, versionName, timeLabel, additional_kwargs, checkInfo, check, model);
  };

  return (
    <StyledGroupContainer>
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
            handleOpenMonitorDialog={handleOpenMonitorDialog}
            monitorToRefreshId={monitorToRefreshId}
            setMonitorToRefreshId={setMonitorToRefreshId}
            onPointClick={handlePointClick}
          />
        ))}
      </Grid>
    </StyledGroupContainer>
  );
};

const StyledGroupContainer = styled(StyledContainer)({
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
