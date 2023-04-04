import React, { useState } from 'react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

import { AlertRuleConfigSchema } from 'api/generated';

import { Typography, useTheme } from '@mui/material';

import { AlertCount } from './components/AlertCount';
import { NoMaxWidthTooltip } from 'components/base/Tooltip';

import {
  StyledAlertName,
  StyledBody,
  StyledBodyItem,
  StyledButton,
  StyledButtonText,
  StyledContainer,
  StyledHeader,
  StyledHeaderContainer,
  StyledHoverContainer,
  StyledTitle,
  StyledValue
} from './AlertRuleConfigItem.style';

import { DeleteIcon, PencilDrawing } from 'assets/icon/icon';
import { OperatorsEnumMap } from 'helpers/conditionOperator';
import { FrequencyMap } from 'helpers/utils/frequency';
import { truncateString } from 'helpers/utils/truncateString';

import { constants } from './alertRuleConfig.constants';

interface AlertRuleConfigItemProps {
  alertRule: AlertRuleConfigSchema;
  onEdit: () => void;
  onDelete: () => void;
}

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

const {
  header,
  alertTitle,
  conditionTitle,
  deleteButton,
  editButton,
  frequencyTitle,
  frequencyOnce,
  recentAlertTitle
} = constants;

const MAX_ALERT_RULE_NAME_LENGTH = 18;
const MAX_ALERT_CONDITION_LENGTH = 20;

export const AlertRuleConfigItem = ({ alertRule, onEdit, onDelete }: AlertRuleConfigItemProps) => {
  const theme = useTheme();

  const {
    alert_severity: severity,
    check_name: checkName,
    non_resolved_alerts: NonResolvedAlerts,
    total_alerts: totalAlerts,
    recent_alert: recentAlert,
    frequency: frequency,
    name,
    user
  } = alertRule;

  const [headerColor, setHeaderColor] = useState(theme.palette.error.dark);
  const [isHovered, setIsHovered] = useState(false);

  const checkFrequencyFormatted = dayjs.duration(FrequencyMap[frequency], 'seconds').humanize();

  const { operator, value } = alertRule.condition;
  const condition = `${OperatorsEnumMap[operator]} ${value}`;
  const alertName = name + ' ' + header.titleString;
  const alertCondition = checkName + ' ' + condition;

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  return (
    <StyledContainer onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} maxWidth={'450px'}>
      <StyledHeaderContainer>
        {severity && <AlertCount severity={severity} setColor={setHeaderColor} />}
        <StyledHeader color={headerColor} isHovered={isHovered}>
          {alertName.length > MAX_ALERT_RULE_NAME_LENGTH ? (
            <NoMaxWidthTooltip title={alertName} placement="top">
              <StyledAlertName>{truncateString(alertName, MAX_ALERT_RULE_NAME_LENGTH)}</StyledAlertName>
            </NoMaxWidthTooltip>
          ) : (
            <StyledAlertName>{alertName}</StyledAlertName>
          )}
          {user && (
            <Typography fontSize={15}>
              {user.created_at
                ? header.createdByDate + dayjs(user.created_at).format('L')
                : header.createdBy + user.full_name || '-'}
            </Typography>
          )}
        </StyledHeader>
      </StyledHeaderContainer>
      <StyledBody>
        <StyledBodyItem>
          <StyledTitle>{conditionTitle}</StyledTitle>
          {alertCondition.length > MAX_ALERT_CONDITION_LENGTH ? (
            <NoMaxWidthTooltip title={alertCondition} placement="top">
              <StyledValue>{truncateString(alertCondition, MAX_ALERT_CONDITION_LENGTH)}</StyledValue>
            </NoMaxWidthTooltip>
          ) : (
            <StyledValue>{alertCondition}</StyledValue>
          )}
        </StyledBodyItem>
        <StyledBodyItem>
          <StyledTitle>{frequencyTitle}</StyledTitle>
          <StyledValue>
            {frequencyOnce} {checkFrequencyFormatted}
          </StyledValue>
        </StyledBodyItem>
        <StyledBodyItem>
          <StyledTitle>{alertTitle}</StyledTitle>
          <StyledBodyItem>
            <Typography sx={{ fontWeight: 600 }}>{NonResolvedAlerts || 0}</Typography>
            <StyledValue>/{totalAlerts || 0}</StyledValue>
          </StyledBodyItem>
        </StyledBodyItem>
        <StyledBodyItem>
          <StyledTitle>{recentAlertTitle}</StyledTitle>
          <StyledValue>{recentAlert ? dayjs(recentAlert).format('L') : '-'}</StyledValue>
        </StyledBodyItem>
      </StyledBody>
      {isHovered && (
        <StyledHoverContainer>
          <StyledButton variant="text" onClick={onEdit}>
            <>
              <PencilDrawing />
              <StyledButtonText>{editButton}</StyledButtonText>
            </>
          </StyledButton>
          <StyledButton
            sx={{
              marginRight: '0.3em'
            }}
            variant="text"
            onClick={onDelete}
          >
            <>
              <DeleteIcon />
              <StyledButtonText>{deleteButton}</StyledButtonText>
            </>
          </StyledButton>
        </StyledHoverContainer>
      )}
    </StyledContainer>
  );
};
