import React, { memo } from 'react';

import { AlertRuleSchema, AlertSeverity, MonitorSchema } from 'api/generated';

import { StyledContainer, StyledSeverity, StyledTypography } from './MonitorAlertRuleWidget.style';
import { ExclamationMarkRhombus } from 'assets/icon/icon';

import { getHighestPriorityAlertRule } from './MonitorAlertRuleWidget.helpers';
import { OperatorsEnumMap } from 'helpers/base/conditionOperator';
import { capitalizeFirstChar } from 'helpers/utils/capitalizeFirstChar';
import { severityColor } from 'helpers/base/severityColor';
import { CheckFilterTypes } from 'helpers/utils/checkUtil';

import { constants } from 'components/Dashboard/dashboard.constants';

interface MonitorAlertRuleWidgetProps {
  monitor: MonitorSchema;
  alertRules: AlertRuleSchema[];
}

const { alertRuleString } = constants.monitorList.monitor.alertRuleWidget;

const MonitorAlertRuleWidgetComponent = ({ monitor, alertRules }: MonitorAlertRuleWidgetProps) => {
  const {
    alert_severity,
    condition: { operator, value }
  } = getHighestPriorityAlertRule(alertRules);

  const severity = capitalizeFirstChar(alert_severity || '');
  const color = severityColor(alert_severity || AlertSeverity.critical);
  const title =
    monitor.additional_kwargs?.check_conf[CheckFilterTypes.AGGREGATION]?.[0] ||
    monitor.additional_kwargs?.check_conf[CheckFilterTypes.SCORER]?.[0] ||
    monitor.check.name;

  return (
    <StyledContainer>
      <ExclamationMarkRhombus fill={color} />
      <StyledTypography>
        {alertRuleString}
        <StyledSeverity component="span" color={color}>
          {severity}
        </StyledSeverity>
        {' - '}
        {title} {OperatorsEnumMap[operator]} {value}
      </StyledTypography>
    </StyledContainer>
  );
};

export const MonitorAlertRuleWidget = memo(MonitorAlertRuleWidgetComponent);
