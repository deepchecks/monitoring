import React, { memo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import {
  StyledBlur,
  StyledCaption,
  StyledCriticality,
  StyledDescription,
  StyledDivider,
  StyledIconButton,
  StyledInfo,
  StyledMainWrapper,
  StyledProperty,
  StyledTitle
} from './AlertRuleItem.style';

import { Checkmark, PencilDrawing } from '../../assets/icon/icon';

import { AlertRule } from '../../helpers/types/alert';

interface AlertRuleItemProps {
  alertRule: AlertRule;
  onOpenDialog: (event: React.MouseEvent<HTMLDivElement>, alertRule: AlertRule) => void;
  onOpenDrawer: (alertRule: AlertRule) => void;
}

const titles = ['Model', 'Check', 'Condition', 'Check Frequency'];

const columnMap = {
  greater_than_equals: '>'
};

dayjs.extend(localizedFormat);

function AlertRuleItemComponent({ alertRule, onOpenDialog, onOpenDrawer }: AlertRuleItemProps) {
  const [hover, setHover] = useState<boolean>(false);

  const { alerts_count, alert_severity, condition, name, repeat_every } = alertRule;

  const data = [name, name, `drift ${columnMap[condition.operator]} ${condition.value}`, repeat_every];

  const handleOpenDialog = (event: React.MouseEvent<HTMLDivElement>) => {
    onOpenDialog(event, alertRule);
  };

  const handleOpenDrawer = () => {
    onOpenDrawer(alertRule);
  };

  const onMouseOver = () => {
    setHover(true);
  };

  const onMouseLeave = () => {
    setHover(false);
  };

  return (
    <StyledMainWrapper onMouseOver={onMouseOver} onMouseLeave={onMouseLeave} onClick={handleOpenDrawer}>
      <StyledCriticality criticality={alert_severity}>
        <Typography variant="h4">{alerts_count}</Typography>
        <Typography variant="subtitle2">{alert_severity}</Typography>
      </StyledCriticality>
      <StyledDescription>
        <Typography variant="h5">{name}</Typography>
        <Typography variant="body2">Latest alert: {dayjs(new Date()).format('L')}</Typography>
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
          <Box>
            <StyledIconButton>
              <PencilDrawing />
            </StyledIconButton>
            <StyledCaption variant="caption">Edit Rule</StyledCaption>
          </Box>
          <Box onClick={handleOpenDialog}>
            <StyledIconButton>
              <Checkmark />
            </StyledIconButton>
            <StyledCaption variant="caption">Resolve all</StyledCaption>
          </Box>
        </StyledBlur>
      )}
    </StyledMainWrapper>
  );
}

export const AlertRuleItem = memo(AlertRuleItemComponent);
