import React, { memo, useState } from 'react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import mixpanel from 'mixpanel-browser';

import useModels from 'hooks/useModels';

import { AlertRuleInfoSchema, AlertSeverity, useGetMonitorApiV1MonitorsMonitorIdGet } from '../api/generated';
import processFrequency from '../helpers/utils/processFrequency';
import { OperatorsEnumMap } from '../helpers/conditionOperator';

import { alpha, Box, Divider, IconButton, styled, Typography } from '@mui/material';

import { Loader } from './Loader';

import { Checkmark, PencilDrawing } from '../assets/icon/icon';
import { AlertRuleDialog } from './AlertRuleDialog';

dayjs.extend(duration);
dayjs.extend(relativeTime);

export type AlertRuleItemProps = {
  alertRule: AlertRuleInfoSchema;
  onResolveOpen: () => void;
  onDrawerOpen: () => void;
};

const titles = ['Model', 'Check', 'Condition', 'Check Frequency'];

export const AlertsRulesItem = memo(({ alertRule, onResolveOpen, onDrawerOpen }: AlertRuleItemProps) => {
  const [hover, setHover] = useState<boolean>(false);
  const [editedAlertRule, setEditedAlertRule] = useState<number | undefined>(undefined);

  const { modelsMap } = useModels();

  const { alerts_count, alert_severity, condition, max_end_time, model_id } = alertRule;

  const { data: monitor = null, isLoading: isMonitorLoading } = useGetMonitorApiV1MonitorsMonitorIdGet(
    alertRule.monitor_id
  );

  const data = [
    modelsMap[model_id]?.name,
    monitor?.check?.name,
    `value ${OperatorsEnumMap[condition.operator]} ${condition.value}`,
    monitor ? processFrequency(dayjs.duration(monitor?.frequency, 'seconds')) : undefined
  ];

  const handleOpenResolve = (event: React.MouseEvent<HTMLDivElement>) => {
    mixpanel.track('Click on the Resolve All');

    event.stopPropagation();
    return onResolveOpen();
  };

  const handleEditRuleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    mixpanel.track('Click on Edit Rule button');

    event.stopPropagation();
    setEditedAlertRule(alertRule.id)
  };

  const onEditRuleClose = () => {
    setEditedAlertRule(undefined);
  };

  const handleOpenDrawer = (event: React.MouseEvent<HTMLDivElement>) => {
    mixpanel.track('Click on the alert');

    event.stopPropagation();
    return onDrawerOpen();
  };

  const onMouseOver = () => setHover(true);
  const onMouseLeave = () => setHover(false);

  if (isMonitorLoading) return <Loader />;

  return (
    <StyledMainWrapper onMouseOver={onMouseOver} onMouseLeave={onMouseLeave} onClick={handleOpenDrawer}>
      <StyledCriticality criticality={alert_severity}>
        <Typography variant="h4">{alerts_count}</Typography>
        <Typography variant="subtitle2">{alert_severity}</Typography>
      </StyledCriticality>
      <StyledDescription>
        <Typography variant="h5">{monitor?.name}</Typography>
        <Typography variant="body2">Latest alert: {dayjs(max_end_time).format('MMM. DD, YYYY')}</Typography>
      </StyledDescription>
      <StyledDivider orientation="vertical" flexItem />
      <StyledInfo>
        {titles.map((title, index) => (
          <StyledProperty key={title}>
            <StyledTitle>{title}</StyledTitle>
            <Typography variant="body2">{data[index]}</Typography>
          </StyledProperty>
        ))}
      </StyledInfo>
      {hover && (
        <StyledBlur>
          <Box onClick={handleEditRuleClick}>
            <StyledIconButton>
              <PencilDrawing width={30} height={30} />
            </StyledIconButton>
            <StyledCaption variant="caption">Edit Rule</StyledCaption>
          </Box>
          <Box onClick={handleOpenResolve}>
            <StyledIconButton>
              <Checkmark width={30} height={30} />
            </StyledIconButton>
            <StyledCaption variant="caption">Resolve all</StyledCaption>
          </Box>
        </StyledBlur>
      )}

    <AlertRuleDialog open={editedAlertRule !== undefined} onClose={onEditRuleClose} alertRuleId={editedAlertRule} />
    </StyledMainWrapper>
  );
});

AlertsRulesItem.displayName = 'AlertsRulesItem';

const StyledMainWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  borderRadius: '10px',
  boxShadow: '0px 4px 13px 2px rgba(0, 0, 0, 0.12)',
  minWidth: 'fit-content',
  height: 100,
  position: 'relative',
  ':hover': {
    backgroundColor: theme.palette.primary.light,
    cursor: 'pointer',
    outline: `6px solid ${theme.palette.primary.contrastText}`
  }
}));

type StyledCriticalityProps = {
  criticality?: AlertSeverity;
};

const StyledCriticality = styled(Box, {
  shouldForwardProp: prop => prop !== 'criticality'
})<StyledCriticalityProps>(({ criticality = 'low', theme }) => {
  const getColor = (filed: AlertSeverity): string => {
    if (filed === 'low') {
      return theme.palette.error.contrastText;
    }

    if (filed === 'mid') {
      return theme.palette.error.light;
    }

    if (filed === 'high') {
      return theme.palette.error.dark;
    }

    if (filed === 'critical') {
      return theme.palette.error.main;
    }

    return theme.palette.error.main;
  };

  return {
    height: '100%',
    backgroundColor: getColor(criticality),
    borderLeft: `5px solid ${alpha(theme.palette.common.white, 0.4)}`,
    minWidth: 80,
    padding: '22px 11px 20px 11px',
    textAlign: 'center',
    borderRadius: '10px 0px 0px 10px',
    color: theme.palette.common.white
  };
});

const StyledDescription = styled(Box)({
  padding: '22px 20px 22px 30px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minWidth: 290
});

const StyledDivider = styled(Divider)(({ theme }) => ({
  borderColor: theme.palette.grey[300],
  margin: '14px 0',
  borderStyle: 'dashed'
}));

const StyledInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '31px 0',
  width: '100%',
  marginLeft: '16px',
  height: '100%'
});

const StyledProperty = styled(Box)({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  width: 215
});

const StyledTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: 12,
  lineHeight: '140%',
  color: theme.palette.text.disabled,
  textTransform: 'uppercase'
}));

const StyledBlur = styled(Box)({
  position: 'absolute',
  right: 0,
  top: 0,
  height: '100%',
  width: 262,
  background: 'linear-gradient(90deg, rgba(241, 233, 254, 0) -12.12%, #F1E9FE 28.76%)',
  borderRadius: '10px',
  padding: '21px 25px 21px 87px',
  display: 'flex',
  justifyContent: 'space-between'
});

const StyledIconButton = styled(IconButton)({
  backgroundColor: 'transparent'
});

const StyledCaption = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  display: 'block'
}));
