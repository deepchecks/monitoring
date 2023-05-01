import React, { memo, useState } from 'react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { AlertRuleInfoSchema, useGetMonitorApiV1MonitorsMonitorIdGet } from 'api/generated';
import useModels from 'helpers/hooks/useModels';
import { AlertRuleDialogProvider } from '../AlertRuleDialog/AlertRuleDialogContext';

import { Tooltip, Typography, Stack } from '@mui/material';

import { AlertRuleDialog } from '../AlertRuleDialog/AlertRuleDialog';
import { Loader } from '../../Loader';

import { OperatorsEnumMap } from 'helpers/conditionOperator';
import processFrequency from 'helpers/utils/processFrequency';
import { events, reportEvent } from 'helpers/services/mixPanel';

import {
  StyledBlur,
  StyledCaption,
  StyledCriticality,
  StyledDescription,
  StyledDivider,
  StyledIconButton,
  StyledInfo,
  StyledMainWrapper,
  StyledMonitorName,
  StyledProperty,
  StyledTitle
} from './AlertsRulesItem.style';

import { Checkmark, PencilDrawing, Sync } from 'assets/icon/icon';
import { FrequencyMap } from 'helpers/utils/frequency';

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

interface AlertsRulesItemProps {
  alertRule: AlertRuleInfoSchema;
  onResolveOpen: () => void;
  onDrawerOpen: () => void;
  resolved?: number;
}

const titles = ['Model', 'Check', 'Condition', 'Check Frequency'];

export const AlertsRulesItem = memo(({ alertRule, onResolveOpen, onDrawerOpen, resolved }: AlertsRulesItemProps) => {
  const [hover, setHover] = useState(false);
  const [editedAlertRule, setEditedAlertRule] = useState<number | undefined>();

  const { modelsMap } = useModels();

  const { alerts_count, alert_severity, condition, max_end_time, model_id } = alertRule;

  const { data: monitor = null, isLoading: isMonitorLoading } = useGetMonitorApiV1MonitorsMonitorIdGet(
    alertRule.monitor_id
  );

  const data = [
    modelsMap[model_id]?.name,
    monitor?.check?.name,
    `${monitor?.check?.name} ${OperatorsEnumMap[condition.operator]} ${condition.value}`,
    monitor ? processFrequency(dayjs.duration(FrequencyMap[monitor?.frequency], 'seconds')) : undefined
  ];

  const handleOpenResolve = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    reportEvent(events.alertsPage.clickedResolveAll);
    return onResolveOpen();
  };

  const handleEditRuleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    reportEvent(events.alertRulesPage.clickedEditRule);
    return setEditedAlertRule(alertRule.id);
  };

  const onEditRuleClose = () => {
    setEditedAlertRule(undefined);
  };

  const handleOpenDrawer = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    reportEvent(events.sidebar.clickedAlertsRules);
    return onDrawerOpen();
  };

  const onMouseOver = () => setHover(true);
  const onMouseLeave = () => setHover(false);

  return isMonitorLoading ? (
    <Loader />
  ) : (
    <>
      <StyledMainWrapper
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        onClick={handleOpenDrawer}
        sx={{ background: 'white' }}
      >
        <StyledCriticality criticality={alert_severity} resolved={resolved}>
          <Typography variant="h4">{alerts_count}</Typography>
          <Typography variant="subtitle2" color="white">
            {alert_severity}
          </Typography>
        </StyledCriticality>
        <StyledDescription>
          <Tooltip title={monitor?.name ? monitor?.name : 'N/A'}>
            <StyledMonitorName noWrap={true} variant="h5">
              {monitor?.name}
            </StyledMonitorName>
          </Tooltip>
          <Typography variant="body2">Latest alert: {dayjs(max_end_time).format('L')}</Typography>
        </StyledDescription>
        <StyledDivider orientation="vertical" flexItem />
        <StyledInfo>
          {titles.map((title, index) => (
            <StyledProperty key={title}>
              <StyledTitle>{title}</StyledTitle>
              <Typography noWrap={true} variant="body2">
                {data[index]}
              </Typography>
            </StyledProperty>
          ))}
        </StyledInfo>
        {hover && (
          <StyledBlur>
            <Stack onClick={handleEditRuleClick}>
              <StyledIconButton>
                <PencilDrawing width={30} height={30} />
              </StyledIconButton>
              <StyledCaption variant="caption">Edit Rule</StyledCaption>
            </Stack>
            <Stack onClick={handleOpenResolve}>
              <StyledIconButton>
                {resolved ? <Sync width={30} height={30} /> : <Checkmark width={30} height={30} />}
              </StyledIconButton>
              <StyledCaption variant="caption">{resolved ? 'Reactivate' : 'Resolve all'}</StyledCaption>
            </Stack>
          </StyledBlur>
        )}
      </StyledMainWrapper>
      <AlertRuleDialogProvider>
        <AlertRuleDialog
          open={!!editedAlertRule}
          onClose={onEditRuleClose}
          startingStep={2}
          alertRuleId={editedAlertRule}
        />
      </AlertRuleDialogProvider>
    </>
  );
});

AlertsRulesItem.displayName = 'AlertsRulesItem';
