import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import mixpanel from 'mixpanel-browser';

import { GlobalStateContext } from 'context';
import { AlertSeverity, ModelManagmentSchema } from 'api/generated';

import { Box } from '@mui/material';

import {
  StyledContainer,
  StyledModelInfo,
  StyledDateContainer,
  StyledDateTitle,
  StyledDateValue,
  StyledAlertBadge,
  StyledModelName,
  StyledAlertsCount
} from './ModelItem.style';

dayjs.extend(localizedFormat);

interface ModelItemProps {
  activeModel: boolean;
  alertsCount: number;
  onModelClick: (modelId: number) => void;
  onReset: (event: React.MouseEvent<HTMLDivElement>) => void;
  model: ModelManagmentSchema;
  severity: AlertSeverity;
}

export function ModelItem({ activeModel, alertsCount, onModelClick, model, severity }: ModelItemProps) {
  const navigate = useNavigate();
  const { changeAlertFilters } = useContext(GlobalStateContext);

  const handleAlertClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    changeAlertFilters(prevAlertFilters => ({ ...prevAlertFilters, models: [model.id] }));
    navigate({ pathname: '/alerts' });
  };

  const handleModelClick = () => {
    mixpanel.track('Click on a model in the model list');
    onModelClick(model.id);
  };

  return (
    <StyledContainer active={activeModel} onClick={handleModelClick}>
      <StyledModelInfo>
        <Box>
          <StyledModelName>{model.name}</StyledModelName>
          <StyledDateContainer>
            <StyledDateTitle>Last data update:&nbsp;</StyledDateTitle>
            <StyledDateValue>{model.latest_time ? dayjs.unix(model.latest_time).format('L') : '-'}</StyledDateValue>
          </StyledDateContainer>
        </Box>
        <StyledAlertBadge severity={severity} alertsCount={alertsCount} onClick={handleAlertClick}>
          <StyledAlertsCount>{alertsCount}</StyledAlertsCount>
        </StyledAlertBadge>
      </StyledModelInfo>
    </StyledContainer>
  );
}
