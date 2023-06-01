import React from 'react';

import { MonitorSchema, OperatorsEnum } from 'api/generated';

import { Typography, Stack, styled } from '@mui/material';

import { MonitorInfoLink } from './MonitorInfoLink';

interface MonitorInfoTooltipBodyProps {
  monitor: MonitorSchema;
}

export const MonitorInfoTooltipBody = ({ monitor }: MonitorInfoTooltipBodyProps) => {
  const monitorFilters = monitor?.data_filters?.filters;
  const filters = monitorFilters
    ? monitorFilters.length > 1
      ? `${monitorFilters[0].value} < ${monitorFilters[0].column} < ${monitorFilters[1].value}`
      : `${monitorFilters[0].column} ${OperatorsEnum[monitorFilters[0].operator]} ${monitorFilters[0].value}`
    : null;

  const alertRules = monitor.alert_rules.map(
    alertRule => `${alertRule.condition.operator} ${alertRule.condition.value}`
  );

  return (
    <Stack>
      <StyledInfoItem>
        <StyledInfoItemTitle>Check:</StyledInfoItemTitle> {monitor.check.name}
      </StyledInfoItem>
      {monitorFilters && (
        <StyledInfoItem>
          <StyledInfoItemTitle>Filter:</StyledInfoItemTitle> {filters}
        </StyledInfoItem>
      )}
      {!!alertRules.length && (
        <StyledInfoItem>
          <StyledInfoItemTitle>Alert condition:</StyledInfoItemTitle> {alertRules.join(', ')}
        </StyledInfoItem>
      )}
      <MonitorInfoLink docsLink={monitor.check.docs_link || ''} />
    </Stack>
  );
};

const StyledInfoItem = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  display: 'inline-block',
  fontWeight: 400,
  fontSize: '14px',
  lineHeight: '15px'
}));

const StyledInfoItemTitle = styled(StyledInfoItem)({
  fontWeight: 600
});
