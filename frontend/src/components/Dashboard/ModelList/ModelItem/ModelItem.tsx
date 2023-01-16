import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import mixpanel from 'mixpanel-browser';

import { GlobalStateContext } from 'context';
import { AlertSeverity, ModelManagmentSchema } from 'api/generated';

import { Box, Typography } from '@mui/material';

import {
  StyledContainer,
  StyledModelInfo,
  StyledTypographyDate,
  StyledAlertBadge,
  StyledActiveModelResetButton
} from './ModelItem.style';

interface ModelItemProps {
  activeModel: boolean;
  alertsCount: number;
  onModelClick: (modelId: number) => void;
  onReset: (event: React.MouseEvent<HTMLDivElement>) => void;
  model: ModelManagmentSchema;
  severity: AlertSeverity;
}

export function ModelItem({ activeModel, alertsCount, onModelClick, onReset, model, severity }: ModelItemProps) {
  const navigate = useNavigate();
  const { changeAlertFilters } = useContext(GlobalStateContext);

  const linkToAlerts = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    changeAlertFilters(prevAlertFilters => ({ ...prevAlertFilters, models: [model.id] }));
    navigate({ pathname: '/alerts' });
  };

  const handleClickModel = () => {
    mixpanel.track('Click on a model in the model list');
    onModelClick(model.id);
  };

  return (
    <StyledContainer active={activeModel} onClick={handleClickModel}>
      <StyledModelInfo>
        <Box>
          <Typography variant="subtitle1">{model.name}</Typography>
          <StyledTypographyDate variant="body2">
            Last data update: {model.latest_time ? dayjs.unix(model.latest_time).format('MMM. DD, YY') : '-'}
          </StyledTypographyDate>
        </Box>
        <StyledAlertBadge severity={severity} onClick={linkToAlerts}>
          <Typography variant="h4" sx={{ lineHeight: '25px' }}>
            {alertsCount}
          </Typography>
          <Typography variant="caption" sx={{ lineHeight: '14px', letterSpacing: '0.1px' }}>
            {`${severity[0].toUpperCase()}${severity.slice(1)}`}
          </Typography>
        </StyledAlertBadge>
      </StyledModelInfo>
      {activeModel && <StyledActiveModelResetButton onClick={onReset} />}
    </StyledContainer>
  );
}
